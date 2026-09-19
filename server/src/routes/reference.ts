import { Router } from "express";
import { and, asc, eq, ilike, sql } from "drizzle-orm";
import { z } from "zod";
import {
  ANIMAL_SEXES,
  ANIMAL_STATUSES,
  CASE_OUTCOMES,
  CASE_STATUSES,
  diseases,
  LAB_PRIORITIES,
  LAB_STATUSES,
  organizations,
  ORGANIZATION_TYPES,
  REGION_LEVELS,
  regions,
  RISK_LEVELS,
  SPECIES,
  symptoms,
  vaccines,
} from "../db/schema.js";
import type { Deps } from "../deps.js";
import { notFound } from "../lib/errors.js";
import { describeRegion } from "../lib/regions.js";
import * as v from "../lib/validation.js";

/**
 * Public reference data. Needed before sign-in (registration picks a village)
 * and cached by the PWA for offline reporting, so it is small and cacheable.
 */
export function referenceRouter(deps: Deps): Router {
  const { db } = deps;
  const router = Router();

  router.get("/catalog", async (req, res) => {
    const { lang } = z.object({ lang: v.language.optional() }).parse(req.query);
    const localize = (name: string, t: Record<string, string>) => (lang && t[lang]) || name;
    const [symptomRows, diseaseRows, vaccineRows] = await Promise.all([
      db.select().from(symptoms).orderBy(asc(symptoms.category), asc(symptoms.name)),
      db.select().from(diseases).orderBy(asc(diseases.name)),
      db.select().from(vaccines).orderBy(asc(vaccines.name)),
    ]);
    res.set("Cache-Control", "public, max-age=3600");
    res.json({
      symptoms: symptomRows.map((s) => ({ ...s, label: localize(s.name, s.translations) })),
      diseases: diseaseRows.map((d) => ({ ...d, label: localize(d.name, d.translations) })),
      vaccines: vaccineRows,
      enums: {
        species: SPECIES,
        animalSexes: ANIMAL_SEXES,
        animalStatuses: ANIMAL_STATUSES,
        caseStatuses: CASE_STATUSES,
        caseOutcomes: CASE_OUTCOMES,
        riskLevels: RISK_LEVELS,
        labPriorities: LAB_PRIORITIES,
        labStatuses: LAB_STATUSES,
        regionLevels: REGION_LEVELS,
        organizationTypes: ORGANIZATION_TYPES,
        languages: v.SUPPORTED_LANGUAGES,
      },
    });
  });

  router.get("/regions", async (req, res) => {
    const q = z
      .object({
        parentId: v.uuid.optional(),
        level: z.enum(REGION_LEVELS).optional(),
        q: z.string().trim().min(1).max(80).optional(),
        limit: z.coerce.number().int().min(1).max(500).default(200),
      })
      .parse(req.query);
    const where = and(
      q.parentId ? eq(regions.parentId, q.parentId) : undefined,
      q.level ? eq(regions.level, q.level) : undefined,
      // With no filter at all, start at the top of the tree.
      !q.parentId && !q.level && !q.q ? eq(regions.level, "state") : undefined,
      q.q ? ilike(regions.name, `%${q.q.replace(/[%_\\]/g, "\\$&")}%`) : undefined,
    );
    const rows = await db
      .select({
        id: regions.id,
        name: regions.name,
        level: regions.level,
        code: regions.code,
        parentId: regions.parentId,
        lat: regions.lat,
        lng: regions.lng,
      })
      .from(regions)
      .where(where)
      .orderBy(asc(regions.name))
      .limit(q.limit);
    res.set("Cache-Control", "public, max-age=600");
    res.json({ items: rows });
  });

  router.get("/regions/:id", async (req, res) => {
    const id = v.uuid.parse(req.params.id);
    const summary = await describeRegion(db, id);
    if (!summary) throw notFound("Region");
    const [region] = await db.select().from(regions).where(eq(regions.id, id));
    const [children] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(regions)
      .where(eq(regions.parentId, id));
    res.json({ ...summary, code: region!.code, lat: region!.lat, lng: region!.lng, childCount: children?.n ?? 0 });
  });

  router.get("/organizations", async (req, res) => {
    const q = z
      .object({
        type: z.enum(ORGANIZATION_TYPES).optional(),
        regionId: v.uuid.optional(),
        q: z.string().trim().min(1).max(80).optional(),
      })
      .parse(req.query);
    const rows = await db
      .select({
        id: organizations.id,
        type: organizations.type,
        name: organizations.name,
        code: organizations.code,
        regionId: organizations.regionId,
      })
      .from(organizations)
      .where(
        and(
          q.type ? eq(organizations.type, q.type) : undefined,
          q.regionId ? eq(organizations.regionId, q.regionId) : undefined,
          q.q ? ilike(organizations.name, `%${q.q.replace(/[%_\\]/g, "\\$&")}%`) : undefined,
        ),
      )
      .orderBy(asc(organizations.name))
      .limit(200);
    res.json({ items: rows });
  });

  return router;
}

