import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { jwtVerify, SignJWT } from "jose";
import { AuthError, type AuthClaims, type AuthProvider, type AuthSession } from "./provider.js";

/**
 * Stand-in for Supabase Auth so the API runs with nothing installed. It issues
 * JWTs with the same claims Supabase does (sub, phone, email, aud) and, instead
 * of sending SMS, hands each OTP to `onOtp` (logged to the console in dev).
 *
 * Development and tests only — config refuses it when NODE_ENV=production.
 */

interface LocalIdentity {
  id: string;
  phone?: string;
  email?: string;
  /** scrypt: `salt:hash`, both hex. */
  passwordHash?: string;
}

interface PendingOtp {
  code: string;
  expiresAt: number;
  attempts: number;
}

interface StoreShape {
  identities: LocalIdentity[];
  refreshTokens: Record<string, string>;
}

export interface LocalAuthOptions {
  jwtSecret: string;
  /** Persist identities between restarts. Null keeps everything in memory. */
  file: string | null;
  /** Accept this code for every phone instead of generating one. */
  fixedOtp?: string;
  onOtp?: (phone: string, otp: string) => void;
}

const ISSUER = "pawvita-local-auth";
const ACCESS_TTL_SECONDS = 60 * 60;
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 32);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

function checkPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

export class LocalAuthProvider implements AuthProvider {
  readonly name = "local";
  private readonly key: Uint8Array;
  private readonly otps = new Map<string, PendingOtp>();
  private store: StoreShape = { identities: [], refreshTokens: {} };

  constructor(private readonly options: LocalAuthOptions) {
    this.key = new TextEncoder().encode(options.jwtSecret);
    if (options.file && fs.existsSync(options.file)) {
      this.store = JSON.parse(fs.readFileSync(options.file, "utf8")) as StoreShape;
    }
  }

  private save() {
    if (!this.options.file) return;
    fs.mkdirSync(path.dirname(this.options.file), { recursive: true });
    fs.writeFileSync(this.options.file, JSON.stringify(this.store, null, 2));
  }

  private byPhone(phone: string) {
    return this.store.identities.find((i) => i.phone === phone);
  }

  private byEmail(email: string) {
    return this.store.identities.find((i) => i.email === email.toLowerCase());
  }

  private create(fields: Omit<LocalIdentity, "id">): LocalIdentity {
    const identity = { id: crypto.randomUUID(), ...fields };
    this.store.identities.push(identity);
    this.save();
    return identity;
  }

  private async issue(identity: LocalIdentity): Promise<AuthSession> {
    const now = Math.floor(Date.now() / 1000);
    const accessToken = await new SignJWT({
      phone: identity.phone?.replace(/^\+/, "") ?? "",
      email: identity.email ?? "",
      role: "authenticated",
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setSubject(identity.id)
      .setIssuer(ISSUER)
      .setAudience("authenticated")
      .setIssuedAt(now)
      .setExpirationTime(now + ACCESS_TTL_SECONDS)
      .sign(this.key);
    const refreshToken = crypto.randomBytes(24).toString("base64url");
    this.store.refreshTokens[refreshToken] = identity.id;
    this.save();
    return { accessToken, refreshToken, expiresAt: now + ACCESS_TTL_SECONDS, authUserId: identity.id };
  }

  async requestOtp(phone: string) {
    const code = this.options.fixedOtp ?? String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
    this.otps.set(phone, { code, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 });
    this.options.onOtp?.(phone, code);
  }

  async verifyOtp(phone: string, otp: string) {
    const pending = this.otps.get(phone);
    if (!pending || pending.expiresAt < Date.now()) {
      this.otps.delete(phone);
      throw new AuthError("The code has expired. Request a new one.", "otp_expired");
    }
    if (pending.code !== otp) {
      pending.attempts += 1;
      if (pending.attempts >= OTP_MAX_ATTEMPTS) this.otps.delete(phone);
      throw new AuthError("The code is incorrect.", "invalid_otp");
    }
    this.otps.delete(phone);
    return this.issue(this.byPhone(phone) ?? this.create({ phone }));
  }

  async signInWithPassword(email: string, password: string) {
    const identity = this.byEmail(email);
    if (!identity?.passwordHash || !checkPassword(password, identity.passwordHash)) {
      throw new AuthError("Invalid login credentials.");
    }
    return this.issue(identity);
  }

  async signUpWithPassword(email: string, password: string) {
    if (this.byEmail(email)) throw new AuthError("An account with this email already exists.", "email_exists", 409);
    const identity = this.create({ email: email.toLowerCase(), passwordHash: hashPassword(password) });
    return { authUserId: identity.id, session: await this.issue(identity) };
  }

  async refresh(refreshToken: string) {
    const id = this.store.refreshTokens[refreshToken];
    const identity = id ? this.store.identities.find((i) => i.id === id) : undefined;
    if (!identity) throw new AuthError("Refresh token is invalid.", "invalid_refresh_token");
    // Rotate, as Supabase does.
    delete this.store.refreshTokens[refreshToken];
    return this.issue(identity);
  }

  async signOut(accessToken: string) {
    const { authUserId } = await this.verifyAccessToken(accessToken).catch(() => ({ authUserId: "" }));
    for (const [token, id] of Object.entries(this.store.refreshTokens)) {
      if (id === authUserId) delete this.store.refreshTokens[token];
    }
    this.save();
  }

  async adminCreateUser(input: { email?: string; phone?: string; password?: string }) {
    if (input.email && this.byEmail(input.email)) {
      throw new AuthError("An account with this email already exists.", "email_exists", 409);
    }
    if (input.phone && this.byPhone(input.phone)) {
      throw new AuthError("An account with this phone already exists.", "phone_exists", 409);
    }
    const identity = this.create({
      email: input.email?.toLowerCase(),
      phone: input.phone,
      passwordHash: input.password ? hashPassword(input.password) : undefined,
    });
    return { authUserId: identity.id };
  }

  async adminDeleteUser(authUserId: string) {
    this.store.identities = this.store.identities.filter((i) => i.id !== authUserId);
    this.save();
  }

  async verifyAccessToken(token: string): Promise<AuthClaims> {
    try {
      const { payload } = await jwtVerify(token, this.key, { issuer: ISSUER, audience: "authenticated" });
      if (!payload.sub) throw new Error("no sub");
      const phone = payload.phone as string | undefined;
      return {
        authUserId: payload.sub,
        phone: phone ? `+${phone}` : undefined,
        email: (payload.email as string | undefined) || undefined,
      };
    } catch {
      throw new AuthError("Your session is invalid or has expired.", "invalid_token");
    }
  }
}
