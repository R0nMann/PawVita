import { createClient, type AuthError as SupabaseAuthError, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify, type JWTPayload } from "jose";
import { AuthError, toE164, type AuthClaims, type AuthProvider, type AuthSession } from "./provider.js";

interface SupabaseSettings {
  url: string;
  publishableKey: string;
  secretKey: string;
  jwtSecret?: string;
}

const STATELESS = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } as const;

function toSession(session: Session | null | undefined): AuthSession {
  if (!session) throw new AuthError("Sign-in did not return a session.", "no_session");
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at ?? Math.floor(Date.now() / 1000) + session.expires_in,
    authUserId: session.user.id,
  };
}

function fail(error: SupabaseAuthError): never {
  // Surface rate limits distinctly so the client can tell the user to wait.
  if (error.status === 429) throw new AuthError(error.message, "rate_limited", 429);
  if (error.status && error.status >= 500) throw new Error(`Supabase Auth error: ${error.message}`);
  throw new AuthError(error.message, error.code ?? "invalid_credentials", error.status === 422 ? 422 : 401);
}

export class SupabaseAuthProvider implements AuthProvider {
  readonly name = "supabase";
  private readonly admin: SupabaseClient;
  private readonly issuer: string;
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;
  private readonly hsKey?: Uint8Array;

  constructor(private readonly settings: SupabaseSettings) {
    this.admin = createClient(settings.url, settings.secretKey, { auth: STATELESS });
    this.issuer = `${settings.url}/auth/v1`;
    // Current projects sign with asymmetric keys published at this JWKS URL.
    this.jwks = createRemoteJWKSet(new URL(`${this.issuer}/.well-known/jwks.json`));
    if (settings.jwtSecret) this.hsKey = new TextEncoder().encode(settings.jwtSecret);
  }

  /**
   * supabase-js keeps the signed-in session on the client instance, so a
   * shared client would mix up concurrent users. Each sign-in call gets its own.
   */
  private client(): SupabaseClient {
    return createClient(this.settings.url, this.settings.publishableKey, { auth: STATELESS });
  }

  async requestOtp(phone: string) {
    const { error } = await this.client().auth.signInWithOtp({
      phone,
      options: { shouldCreateUser: true, channel: "sms" },
    });
    if (error) fail(error);
  }

  async verifyOtp(phone: string, otp: string) {
    const { data, error } = await this.client().auth.verifyOtp({ phone, token: otp, type: "sms" });
    if (error) fail(error);
    return toSession(data.session);
  }

  async signInWithPassword(email: string, password: string) {
    const { data, error } = await this.client().auth.signInWithPassword({ email, password });
    if (error) fail(error);
    return toSession(data.session);
  }

  async signUpWithPassword(email: string, password: string) {
    const { data, error } = await this.client().auth.signUp({ email, password });
    if (error) fail(error);
    if (!data.user) throw new AuthError("Sign-up did not return a user.", "no_user");
    // With email confirmation on, Supabase returns a user with no identities for
    // an address that is already registered instead of an error.
    if (data.user.identities && data.user.identities.length === 0) {
      throw new AuthError("An account with this email already exists.", "email_exists", 409);
    }
    return { authUserId: data.user.id, session: data.session ? toSession(data.session) : null };
  }

  async refresh(refreshToken: string) {
    const { data, error } = await this.client().auth.refreshSession({ refresh_token: refreshToken });
    if (error) fail(error);
    return toSession(data.session);
  }

  async signOut(accessToken: string) {
    const { error } = await this.admin.auth.admin.signOut(accessToken, "local");
    // An already-expired session is as good as signed out.
    if (error && error.status !== 401 && error.status !== 404) fail(error);
  }

  async adminCreateUser(input: { email?: string; phone?: string; password?: string }) {
    const { data, error } = await this.admin.auth.admin.createUser({
      email: input.email,
      phone: input.phone,
      password: input.password,
      email_confirm: input.email ? true : undefined,
      phone_confirm: input.phone ? true : undefined,
    });
    if (error) fail(error);
    return { authUserId: data.user.id };
  }

  async adminDeleteUser(authUserId: string) {
    const { error } = await this.admin.auth.admin.deleteUser(authUserId);
    if (error && error.status !== 404) fail(error);
  }

  async verifyAccessToken(token: string): Promise<AuthClaims> {
    let payload: JWTPayload;
    try {
      const { alg } = decodeProtectedHeader(token);
      const options = { issuer: this.issuer, audience: "authenticated" };
      if (alg === "HS256") {
        // Legacy projects sign with the shared JWT secret.
        if (!this.hsKey) throw new AuthError("Token signed with HS256 but SUPABASE_JWT_SECRET is not set.");
        ({ payload } = await jwtVerify(token, this.hsKey, options));
      } else {
        ({ payload } = await jwtVerify(token, this.jwks, options));
      }
    } catch (err) {
      if (err instanceof AuthError) throw err;
      throw new AuthError("Your session is invalid or has expired.", "invalid_token");
    }
    if (!payload.sub) throw new AuthError("Token has no subject.", "invalid_token");
    return {
      authUserId: payload.sub,
      phone: toE164(payload.phone as string | undefined),
      email: (payload.email as string | undefined)?.toLowerCase() || undefined,
    };
  }
}
