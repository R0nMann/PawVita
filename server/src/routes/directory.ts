import { Router } from "express";
import { and, asc, eq, ilike, sql } from "drizzle-orm";
import { z } from "zod";
import { currentUser, requireRole } from "../auth/middleware.js";
import { cases, organizations, regions, users } from "../db/schema.js";
import type { Deps } from "../deps.js";
import { regionContains, requireRegion } from "../lib/regions.js";
import * as v from "../lib/validation.js";

/**
 * Who is who, for staff: the vets a case can be assigned to and the team
 * panel on the veterinary dashboard. Contact details are for staff only.
 */
export function directoryRouter(deps: Deps): Router {
  const { db } = deps;
  const router = Router();
  router.use(requireRole("vet", "official", "ward_staff", "admin"));

  router.get("/vets", async (req, res) => {
    const me = currentUser(req);
    const q = z
      .object({
        regionId: v.uuid.optional(),
        organizationId: v.uuid.optional(),
        q: z.string().trim().min(1).max(80).optional(),
      })
      .parse(req.query);
    // Default to the caller's own area; admins and national staff see everyone.
    const region = q.regionId ? await requireRegion(db, q.regionId) : me.region;
    const rows = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        phone: users.phone,
        email: users.email,
        organizationId: users.organizationId,
        organizationName: organizations.name,
        regionId: users.regionId,
        regionName: regions.name,
        stateId: regions.stateId,
        districtId: regions.districtId,
        blockId: regions.blockId,
        villageId: regions.villageId,
        level: regions.level,
        openCases: sql<number>`(select count(*)::int from ${cases} where ${cases.assignedVetId} = ${users.id}
          and ${cases.status} <> 'resolved')`,
      })
      .from(users)
      .leftJoin(regions, eq(regions.id, users.regionId))
      .leftJoin(organizations, eq(organizations.id, users.organizationId))
      .where(
        and(
          eq(users.role, "vet"),
          eq(users.status, "active"),
          q.organizationId ? eq(users.organizationId, q.organizationId) : undefined,
          q.q ? ilike(users.fullName, v.likePattern(q.q)) : undefined,
        ),
      )
      .orderBy(asc(users.fullName))
      .limit(200);

    // A vet is relevant when their area overlaps the requested one: inside it, or covering it.
    const items = rows.filter((r) => {
      if (!region || region.level === "country" || !r.regionId || !r.level) return !region || region.level === "country";
      const vetRef = {
        id: r.regionId,
        level: r.level,
        name: r.regionName ?? "",
        stateId: r.stateId,
        districtId: r.districtId,
        blockId: r.blockId,
        villageId: r.villageId,
      };
      return regionContains(region, vetRef) || regionContains(vetRef, region);
    });
    res.json({
      items: items.map((r) => ({
        id: r.id,
        fullName: r.fullName,
        phone: r.phone,
        email: r.email,
        organization: r.organizationId ? { id: r.organizationId, name: r.organizationName } : null,
        region: r.regionId ? { id: r.regionId, name: r.regionName, level: r.level } : null,
        openCases: r.openCases,
      })),
    });
  });

  return router;
}
