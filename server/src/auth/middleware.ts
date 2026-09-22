import type { NextFunction, Request, RequestHandler, Response } from "express";
import { eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { regions, users, type USER_ROLES } from "../db/schema.js";
import { forbidden, HttpError, unauthorized } from "../lib/errors.js";
import type { RegionRef } from "../lib/regions.js";
import { AuthError, type AuthClaims, type AuthProvider } from "./provider.js";

export type Role = (typeof USER_ROLES)[number];

export interface CurrentUser {
  id: string;
  authUserId: string | null;
  role: Role;
  status: "pending" | "active" | "suspended";
  fullName: string;
  phone: string | null;
  email: string | null;
  username: string | null;
  organizationId: string | null;
  regionId: string | null;
  preferredLanguage: string;
  /** Sign-in skips the emailed second factor for this account. */
  twoFactorExempt: boolean;
  /** Home village (farmers) or area of responsibility (staff). */
  region: RegionRef | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Verified token claims — present on any authenticated request. */
      auth?: { claims: AuthClaims; token: string };
      /** The PawVita user — present once the identity has completed registration. */
      user?: CurrentUser;
    }
  }
}

function bearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" && token ? token : null;
}

export async function loadUserByAuthId(db: Db, authUserId: string): Promise<CurrentUser | undefined> {
  const [row] = await db
    .select({
      user: users,
      region: {
        id: regions.id,
        level: regions.level,
        name: regions.name,
        stateId: regions.stateId,
        districtId: regions.districtId,
        blockId: regions.blockId,
        villageId: regions.villageId,
      },
    })
    .from(users)
    .leftJoin(regions, eq(regions.id, users.regionId))
    .where(eq(users.authUserId, authUserId));
  if (!row) return undefined;
  const u = row.user;
  return {
    id: u.id,
    authUserId: u.authUserId,
    role: u.role,
    status: u.status,
    fullName: u.fullName,
    phone: u.phone,
    email: u.email,
    username: u.username,
    organizationId: u.organizationId,
    regionId: u.regionId,
    preferredLanguage: u.preferredLanguage,
    twoFactorExempt: u.twoFactorExempt,
    region: row.region?.id ? (row.region as RegionRef) : null,
  };
}

/**
 * Verify the bearer token and attach `req.auth`, plus `req.user` when the
 * identity has a PawVita account. Rejects requests without a valid token.
 */
export function authenticate(db: Db, provider: AuthProvider): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const token = bearer(req);
    if (!token) return next(unauthorized());
    let claims: AuthClaims;
    try {
      claims = await provider.verifyAccessToken(token);
    } catch (err) {
      if (err instanceof AuthError) return next(new HttpError(401, err.code, err.message));
      return next(err);
    }
    req.auth = { claims, token };
    req.user = await loadUserByAuthId(db, claims.authUserId);
    next();
  };
}

/**
 * Require a registered, active account. Identities that verified an OTP but
 * have not registered get `profile_required` so the client can route them to
 * the registration form.
 */
export const requireActiveUser: RequestHandler = (req, _res, next) => {
  const user = req.user;
  if (!user) {
    return next(new HttpError(403, "profile_required", "Complete registration to continue."));
  }
  if (user.status === "pending") {
    return next(new HttpError(403, "account_pending", "Your account is awaiting administrator approval."));
  }
  if (user.status === "suspended") {
    return next(new HttpError(403, "account_suspended", "Your account has been suspended."));
  }
  next();
};

export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return next(forbidden());
    next();
  };
}

/** The active user on a request that passed `requireActiveUser`. */
export function currentUser(req: Request): CurrentUser {
  if (!req.user) throw unauthorized();
  return req.user;
}

export function hasRole(user: CurrentUser, ...roles: Role[]): boolean {
  return roles.includes(user.role);
}
