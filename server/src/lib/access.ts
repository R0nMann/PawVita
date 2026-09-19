import { and, eq, or, sql, type SQL } from "drizzle-orm";
import type { CurrentUser } from "../auth/middleware.js";
import type { Db } from "../db/client.js";
import { admissions, animals, cases, herds, labRequests } from "../db/schema.js";
import { forbidden, notFound } from "./errors.js";
import { withinRegion } from "./regions.js";

/**
 * Who can see what. Every list and detail query is filtered through these
 * conditions, so access rules live in one place.
 *
 * - admin         everything
 * - official      everything inside their region (read-only clinically)
 * - vet           cases in their region, plus cases assigned to or reported by them
 * - field_worker  herds and cases in their region, plus anything they created
 * - ward_staff    cases reported by them or referred to their hospital, and
 *                 animals admitted to their hospital
 * - lab_tech      cases with a lab request addressed to their lab
 * - farmer        their own herds and the cases on them
 *
 * A staff account with no region set sees only what is linked to them directly.
 */

const NOTHING = sql`false`;
const EVERYTHING = sql`true`;

function inRegion(user: CurrentUser, cols: Parameters<typeof withinRegion>[0]): SQL {
  return user.region ? withinRegion(cols, user.region) : NOTHING;
}

/** Condition on `herds` for herds the user can see. */
export function herdVisibility(user: CurrentUser): SQL {
  switch (user.role) {
    case "admin":
      return EVERYTHING;
    case "farmer":
      return eq(herds.ownerId, user.id);
    case "field_worker":
    case "vet":
    case "official":
      return or(inRegion(user, herds), eq(herds.createdById, user.id))!;
    case "ward_staff":
      return or(
        eq(herds.createdById, user.id),
        user.organizationId
          ? sql`exists (select 1 from ${admissions} join ${animals} on ${animals.id} = ${admissions.animalId}
                where ${animals.herdId} = ${herds.id} and ${admissions.organizationId} = ${user.organizationId})`
          : NOTHING,
      )!;
    case "lab_tech":
      return NOTHING;
  }
}

/** Condition on `herds` for herds the user may add animals to or edit. */
export function herdWritable(user: CurrentUser): SQL {
  // Officials monitor; they do not maintain herd registers.
  return user.role === "official" ? NOTHING : herdVisibility(user);
}

/** Condition on `cases` for cases the user can see. */
export function caseVisibility(user: CurrentUser): SQL {
  switch (user.role) {
    case "admin":
      return EVERYTHING;
    case "official":
      return inRegion(user, cases);
    case "vet":
      return or(inRegion(user, cases), eq(cases.assignedVetId, user.id), eq(cases.reportedById, user.id))!;
    case "field_worker":
      return or(inRegion(user, cases), eq(cases.reportedById, user.id))!;
    case "ward_staff":
      return or(
        eq(cases.reportedById, user.id),
        user.organizationId ? eq(cases.assignedOrgId, user.organizationId) : NOTHING,
        user.organizationId
          ? sql`exists (select 1 from ${admissions} where ${admissions.animalId} = ${cases.animalId}
                and ${admissions.organizationId} = ${user.organizationId})`
          : NOTHING,
      )!;
    case "lab_tech":
      return user.organizationId
        ? sql`exists (select 1 from ${labRequests} where ${labRequests.caseId} = ${cases.id}
              and ${labRequests.labOrgId} = ${user.organizationId})`
        : NOTHING;
    case "farmer":
      return or(
        eq(cases.reportedById, user.id),
        sql`exists (select 1 from ${herds} where ${herds.id} = ${cases.herdId} and ${herds.ownerId} = ${user.id})`,
      )!;
  }
}

/** Roles that make clinical decisions on a case (status, risk, treatment, lab). */
export const CLINICAL_ROLES = ["vet", "admin"] as const;

/** Farmer-side roles see a filtered timeline without internal notes. */
export function isReporterSide(user: CurrentUser): boolean {
  return user.role === "farmer" || user.role === "field_worker";
}

export async function loadVisibleCase(db: Db, user: CurrentUser, caseId: string) {
  const [row] = await db
    .select()
    .from(cases)
    .where(and(eq(cases.id, caseId), caseVisibility(user)));
  // 404 rather than 403 so ids of other people's cases are not confirmed.
  if (!row) throw notFound("Case");
  return row;
}

export async function loadVisibleHerd(db: Db, user: CurrentUser, herdId: string) {
  const [row] = await db
    .select()
    .from(herds)
    .where(and(eq(herds.id, herdId), herdVisibility(user)));
  if (!row) throw notFound("Herd");
  return row;
}

export async function loadWritableHerd(db: Db, user: CurrentUser, herdId: string) {
  const herd = await loadVisibleHerd(db, user, herdId);
  const [writable] = await db
    .select({ id: herds.id })
    .from(herds)
    .where(and(eq(herds.id, herdId), herdWritable(user)));
  if (!writable) throw forbidden("You cannot modify this herd.");
  return herd;
}

export async function loadVisibleAnimal(db: Db, user: CurrentUser, animalId: string) {
  const [row] = await db
    .select({ animal: animals, herd: herds })
    .from(animals)
    .innerJoin(herds, eq(herds.id, animals.herdId))
    .where(and(eq(animals.id, animalId), herdVisibility(user)));
  if (!row) throw notFound("Animal");
  return row;
}
