import { and, eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { organizations, users } from "../db/schema.js";
import { badRequest } from "../lib/errors.js";
import { describeRegion } from "../lib/regions.js";
import { notify } from "./notifications.js";

type UserRow = typeof users.$inferSelect;

/** The fields of a user that are safe to return to any client that may see them. */
export function presentUser(u: UserRow) {
  return {
    id: u.id,
    role: u.role,
    status: u.status,
    fullName: u.fullName,
    phone: u.phone,
    email: u.email,
    username: u.username,
    organizationId: u.organizationId,
    regionId: u.regionId,
    preferredLanguage: u.preferredLanguage,
    hasLogin: u.authUserId !== null,
    createdAt: u.createdAt,
    approvedAt: u.approvedAt,
  };
}

/** Minimal identity for embedding in other resources (case reporter, vet, …). */
export function presentPerson(u: Pick<UserRow, "id" | "fullName" | "role"> & { phone?: string | null }) {
  return { id: u.id, fullName: u.fullName, role: u.role, ...(u.phone !== undefined && { phone: u.phone }) };
}

/** A user with their region path and organisation — the `GET /me` shape. */
export async function loadAccount(db: Db, userId: string) {
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  if (!u) return null;
  const [org] = u.organizationId
    ? await db
        .select({ id: organizations.id, name: organizations.name, code: organizations.code, type: organizations.type })
        .from(organizations)
        .where(eq(organizations.id, u.organizationId))
    : [];
  return { ...presentUser(u), region: await describeRegion(db, u.regionId), organization: org ?? null };
}

export async function resolveOrganizationCode(db: Db, code: string | undefined) {
  if (!code) return null;
  const [org] = await db
    .select({ id: organizations.id, type: organizations.type })
    .from(organizations)
    .where(eq(organizations.code, code.trim().toLowerCase()));
  if (!org) throw badRequest("Unknown organisation code.", { organizationCode: code });
  return org;
}

export async function notifyAdminsOfRegistration(db: Db, u: Pick<UserRow, "id" | "fullName" | "role">) {
  const admins = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "admin"), eq(users.status, "active")));
  await notify(
    db,
    admins.map((a) => a.id),
    {
      type: "account",
      title: "Registration awaiting approval",
      body: `${u.fullName} registered as ${u.role.replace("_", " ")}.`,
      data: { userId: u.id },
    },
  );
}
