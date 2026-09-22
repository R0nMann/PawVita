import { Router } from "express";
import { eq, or } from "drizzle-orm";
import { z } from "zod";
import { authenticate, loadUserByAuthId, requireActiveUser, currentUser } from "../auth/middleware.js";
import { AuthError, type AuthSession } from "../auth/provider.js";
import { users } from "../db/schema.js";
import type { Deps } from "../deps.js";
import { badRequest, conflict, HttpError } from "../lib/errors.js";
import { rateLimits } from "../lib/rateLimits.js";
import { requireRegion } from "../lib/regions.js";
import * as v from "../lib/validation.js";
import { loadAccount, notifyAdminsOfRegistration, resolveOrganizationCode } from "../services/users.js";

/** Roles a person may pick for themselves. Admins are created by other admins. */
const SELF_SERVICE_ROLES = ["farmer", "field_worker", "vet", "ward_staff", "lab_tech", "official"] as const;

const username = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9._-]{2,39}$/, "3–40 characters: letters, digits, dot, dash or underscore.");

const password = z.string().min(8, "Use at least 8 characters.").max(128);

function presentSession(s: AuthSession) {
  return { accessToken: s.accessToken, refreshToken: s.refreshToken, expiresAt: s.expiresAt };
}

/** Translate provider errors (bad OTP, wrong password) into HTTP responses. */
function wrapAuth<T>(fn: () => Promise<T>): Promise<T> {
  return fn().catch((err) => {
    if (err instanceof AuthError) throw new HttpError(err.status, err.code, err.message);
    throw err;
  });
}

export function authRouter(deps: Deps): Router {
  const { db, auth, config } = deps;
  const router = Router();
  const authed = authenticate(db, auth);

  const limits = rateLimits(config);

  // --- Email / username + password (every account) --------------------------

  /** The sign-in screen accepts an institution/staff ID; the provider needs the email behind it. */
  async function emailForIdentifier(identifier: string): Promise<string> {
    const value = identifier.toLowerCase();
    if (value.includes("@")) return value;
    const [row] = await db.select({ email: users.email }).from(users).where(eq(users.username, value));
    if (!row?.email) throw new HttpError(401, "invalid_credentials", "Invalid login credentials.");
    return row.email;
  }

  /** "meera.patel@pawvita.in" → "me•••@pawvita.in", so the screen can say where the code went. */
  function maskEmail(email: string): string {
    const [local = "", domain = ""] = email.split("@");
    return `${local.slice(0, 2)}${"•".repeat(Math.max(local.length - 2, 1))}@${domain}`;
  }

  router.post("/login", limits.loginPerIp, limits.loginPerIdentifier, async (req, res) => {
    const body = z
      .object({ identifier: z.string().trim().min(3).max(254), password: z.string().min(1).max(128) })
      .parse(req.body);
    const email = await emailForIdentifier(body.identifier);
    const session = await wrapAuth(() => auth.signInWithPassword(email, body.password));
    const user = await loadUserByAuthId(db, session.authUserId);

    if (config.twoFactor.enabled && !user?.twoFactorExempt) {
      // The password is right, but it does not buy a session on its own: drop
      // the one the provider just issued and send a code to finish with.
      await auth.signOut(session.accessToken).catch(() => {});
      await wrapAuth(() => auth.requestEmailOtp(email));
      res.json({ twoFactorRequired: true, email: maskEmail(email), session: null, user: null, registrationRequired: false });
      return;
    }

    res.json({
      twoFactorRequired: false,
      session: presentSession(session),
      user: user ? await loadAccount(db, user.id) : null,
      registrationRequired: !user,
    });
  });

  /** Second step of staff sign-in: the code emailed by /login. */
  router.post("/login/verify", limits.loginPerIp, limits.twoFactorVerifyPerIdentifier, async (req, res) => {
    const body = z
      .object({ identifier: z.string().trim().min(3).max(254), otp: z.string().regex(/^\d{4,8}$/) })
      .parse(req.body);
    const email = await emailForIdentifier(body.identifier);
    const session = await wrapAuth(() => auth.verifyEmailOtp(email, body.otp));
    const user = await loadUserByAuthId(db, session.authUserId);
    res.json({
      twoFactorRequired: false,
      session: presentSession(session),
      user: user ? await loadAccount(db, user.id) : null,
      registrationRequired: !user,
    });
  });

  router.post("/refresh", limits.refreshPerIp, async (req, res) => {
    const { refreshToken } = z.object({ refreshToken: z.string().min(1) }).parse(req.body);
    const session = await wrapAuth(() => auth.refresh(refreshToken));
    res.json({ session: presentSession(session) });
  });

  router.post("/logout", authed, async (req, res) => {
    await wrapAuth(() => auth.signOut(req.auth!.token));
    res.status(204).end();
  });

  // --- Registration ---------------------------------------------------------

  /**
   * Self-service registration, for every role a person may pick themselves.
   *
   * Farmers are active immediately; every other role waits for an administrator
   * to approve it. A farmer a field worker registered earlier has a profile but
   * no login — that record is claimed here by matching the email, rather than
   * creating a second one.
   */
  router.post("/register", limits.registerPerIp, async (req, res) => {
    const body = z
      .object({
        email: v.email,
        password,
        fullName: v.text(120),
        role: z.enum(SELF_SERVICE_ROLES).default("farmer"),
        username: username.optional(),
        phone: v.phone.optional(),
        organizationCode: z.string().trim().max(60).optional(),
        regionId: v.uuid.optional(),
        preferredLanguage: v.language.default("en"),
      })
      .parse(req.body);

    if (body.role === "farmer" && !body.regionId) throw badRequest("Choose your village.", { field: "regionId" });
    const region = body.regionId ? await requireRegion(db, body.regionId) : null;
    if (body.role === "farmer" && region && ["country", "state"].includes(region.level)) {
      throw badRequest("Choose your village, block or district.", { field: "regionId" });
    }
    const org = await resolveOrganizationCode(db, body.organizationCode);

    const clash = await db
      .select({ id: users.id, authUserId: users.authUserId, email: users.email, username: users.username, phone: users.phone })
      .from(users)
      .where(
        or(
          eq(users.email, body.email),
          body.username ? eq(users.username, body.username) : undefined,
          body.phone ? eq(users.phone, body.phone) : undefined,
        ),
      );
    // A profile with this email and no login yet is this person's own record.
    const claimable = clash.find((c) => c.email === body.email && !c.authUserId);
    const blocking = clash.filter((c) => c.id !== claimable?.id);
    if (blocking.length) {
      const fields = blocking.flatMap((c) => [
        ...(c.email === body.email ? ["email"] : []),
        ...(body.username && c.username === body.username ? ["username"] : []),
        ...(body.phone && c.phone === body.phone ? ["phone"] : []),
      ]);
      throw conflict("An account with these details already exists.", { fields: [...new Set(fields)] });
    }

    const identity = await wrapAuth(() => auth.signUpWithPassword(body.email, body.password));
    let userId: string;
    try {
      if (claimable) {
        const [claimed] = await db
          .update(users)
          .set({
            authUserId: identity.authUserId,
            username: body.username ?? undefined,
            phone: body.phone ?? undefined,
            regionId: region?.id,
            organizationId: org?.id,
            preferredLanguage: body.preferredLanguage,
          })
          .where(eq(users.id, claimable.id))
          .returning();
        userId = claimed!.id;
      } else {
        const [created] = await db
          .insert(users)
          .values({
            authUserId: identity.authUserId,
            role: body.role,
            status: body.role === "farmer" ? "active" : "pending",
            fullName: body.fullName,
            email: body.email,
            username: body.username,
            phone: body.phone,
            regionId: region?.id,
            organizationId: org?.id,
            preferredLanguage: body.preferredLanguage,
          })
          .returning();
        userId = created!.id;
        if (created!.status === "pending") await notifyAdminsOfRegistration(db, created!);
      }
    } catch (err) {
      // Do not leave an orphaned login behind if the profile could not be saved.
      await auth.adminDeleteUser(identity.authUserId).catch(() => {});
      throw err;
    }
    res.status(201).json({
      user: await loadAccount(db, userId),
      session: identity.session ? presentSession(identity.session) : null,
      emailConfirmationRequired: identity.session === null,
    });
  });

  return router;
}

/** `/me` — the signed-in account. Works before registration and while pending. */
export function meRouter(deps: Deps): Router {
  const { db, auth } = deps;
  const router = Router();
  router.use(authenticate(db, auth));

  router.get("/", async (req, res) => {
    if (!req.user) {
      res.json({ user: null, registrationRequired: true, identity: req.auth!.claims });
      return;
    }
    res.json({ user: await loadAccount(db, req.user.id), registrationRequired: false });
  });

  router.patch("/", requireActiveUser, async (req, res) => {
    const me = currentUser(req);
    const body = z
      .object({
        fullName: v.text(120).optional(),
        preferredLanguage: v.language.optional(),
        // Farmers may move village; staff jurisdiction is set by an administrator.
        regionId: v.uuid.optional(),
      })
      .strict()
      .refine(v.hasChanges, v.nothingToChange)
      .parse(req.body);
    if (body.regionId) {
      if (me.role !== "farmer") throw new HttpError(403, "forbidden", "Ask an administrator to change your area.");
      const region = await requireRegion(db, body.regionId);
      if (["country", "state"].includes(region.level)) throw badRequest("Choose your village, block or district.");
    }
    await db.update(users).set(body).where(eq(users.id, me.id));
    res.json({ user: await loadAccount(db, me.id) });
  });

  return router;
}
