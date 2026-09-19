import { Router } from "express";
import { and, eq, isNull, or } from "drizzle-orm";
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
const STAFF_ROLES = ["field_worker", "vet", "ward_staff", "lab_tech", "official"] as const;

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

  // --- Phone + OTP (farmers and field staff) --------------------------------

  router.post("/otp/request", limits.otpSendPerIp, limits.otpSendPerPhone, async (req, res) => {
    const { phone } = z.object({ phone: v.phone }).parse(req.body);
    await wrapAuth(() => auth.requestOtp(phone));
    res.json({ sent: true, phone });
  });

  router.post("/otp/verify", limits.otpVerifyPerPhone, async (req, res) => {
    const body = z.object({ phone: v.phone, otp: z.string().regex(/^\d{4,8}$/) }).parse(req.body);
    const session = await wrapAuth(() => auth.verifyOtp(body.phone, body.otp));

    let user = await loadUserByAuthId(db, session.authUserId);
    if (!user) {
      // A field worker may have registered this farmer before they had a login.
      await db
        .update(users)
        .set({ authUserId: session.authUserId })
        .where(and(eq(users.phone, body.phone), isNull(users.authUserId)));
      user = await loadUserByAuthId(db, session.authUserId);
    }
    res.json({
      session: presentSession(session),
      user: user ? await loadAccount(db, user.id) : null,
      registrationRequired: !user,
    });
  });

  // --- Email / username + password (institutions) ---------------------------

  router.post("/login", limits.loginPerIp, limits.loginPerIdentifier, async (req, res) => {
    const body = z
      .object({ identifier: z.string().trim().min(3).max(254), password: z.string().min(1).max(128) })
      .parse(req.body);
    let email = body.identifier.toLowerCase();
    if (!email.includes("@")) {
      // The sign-in screen accepts an institution/staff ID; Supabase needs the email behind it.
      const [row] = await db.select({ email: users.email }).from(users).where(eq(users.username, email));
      if (!row?.email) throw new HttpError(401, "invalid_credentials", "Invalid login credentials.");
      email = row.email;
    }
    const session = await wrapAuth(() => auth.signInWithPassword(email, body.password));
    const user = await loadUserByAuthId(db, session.authUserId);
    res.json({
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
   * Complete registration for an identity that has just verified its phone.
   * Farmers are active immediately; every other role waits for an admin.
   */
  router.post("/register/phone", authed, async (req, res) => {
    const body = z
      .object({
        fullName: v.text(120),
        role: z.enum(SELF_SERVICE_ROLES).default("farmer"),
        regionId: v.uuid.optional(),
        preferredLanguage: v.language.default("en"),
        organizationCode: z.string().trim().max(60).optional(),
      })
      .parse(req.body);
    if (req.user) throw conflict("This account is already registered.");
    const phone = req.auth!.claims.phone;
    if (!phone) throw badRequest("Verify a phone number before registering this way.");
    if (body.role === "farmer" && !body.regionId) throw badRequest("Choose your village.", { field: "regionId" });

    const region = body.regionId ? await requireRegion(db, body.regionId) : null;
    if (body.role === "farmer" && region && ["country", "state"].includes(region.level)) {
      throw badRequest("Choose your village, block or district.", { field: "regionId" });
    }
    const org = await resolveOrganizationCode(db, body.organizationCode);

    const [existing] = await db.select().from(users).where(eq(users.phone, phone));
    if (existing?.authUserId) throw conflict("This phone number is already registered to another account.");
    if (existing) {
      // Registered earlier by a field worker: claim that record rather than duplicating it.
      await db.update(users).set({ authUserId: req.auth!.claims.authUserId }).where(eq(users.id, existing.id));
      res.status(200).json({ user: await loadAccount(db, existing.id) });
      return;
    }

    const [created] = await db
      .insert(users)
      .values({
        authUserId: req.auth!.claims.authUserId,
        role: body.role,
        status: body.role === "farmer" ? "active" : "pending",
        fullName: body.fullName,
        phone,
        regionId: region?.id,
        organizationId: org?.id,
        preferredLanguage: body.preferredLanguage,
      })
      .returning();
    if (created!.status === "pending") await notifyAdminsOfRegistration(db, created!);
    res.status(201).json({ user: await loadAccount(db, created!.id) });
  });

  /** Institutional staff sign up with an email and password; an admin then approves them. */
  router.post("/register/staff", limits.registerPerIp, async (req, res) => {
    const body = z
      .object({
        email: v.email,
        password,
        fullName: v.text(120),
        role: z.enum(STAFF_ROLES),
        username: username.optional(),
        phone: v.phone.optional(),
        organizationCode: z.string().trim().max(60).optional(),
        regionId: v.uuid.optional(),
        preferredLanguage: v.language.default("en"),
      })
      .parse(req.body);

    const region = body.regionId ? await requireRegion(db, body.regionId) : null;
    const org = await resolveOrganizationCode(db, body.organizationCode);
    const clash = await db
      .select({ email: users.email, username: users.username, phone: users.phone })
      .from(users)
      .where(
        or(
          eq(users.email, body.email),
          body.username ? eq(users.username, body.username) : undefined,
          body.phone ? eq(users.phone, body.phone) : undefined,
        ),
      );
    if (clash.length) {
      const fields = clash.flatMap((c) => [
        ...(c.email === body.email ? ["email"] : []),
        ...(body.username && c.username === body.username ? ["username"] : []),
        ...(body.phone && c.phone === body.phone ? ["phone"] : []),
      ]);
      throw conflict("An account with these details already exists.", { fields: [...new Set(fields)] });
    }

    const identity = await wrapAuth(() => auth.signUpWithPassword(body.email, body.password));
    let createdId: string;
    try {
      const [created] = await db
        .insert(users)
        .values({
          authUserId: identity.authUserId,
          role: body.role,
          status: "pending",
          fullName: body.fullName,
          email: body.email,
          username: body.username,
          phone: body.phone,
          regionId: region?.id,
          organizationId: org?.id,
          preferredLanguage: body.preferredLanguage,
        })
        .returning();
      createdId = created!.id;
      await notifyAdminsOfRegistration(db, created!);
    } catch (err) {
      // Do not leave an orphaned login behind if the profile could not be saved.
      await auth.adminDeleteUser(identity.authUserId).catch(() => {});
      throw err;
    }
    res.status(201).json({
      user: await loadAccount(db, createdId),
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
