import { Router } from "express";
import { and, desc, eq, gt, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { currentUser, requireRole, type CurrentUser } from "../auth/middleware.js";
import type { Db } from "../db/client.js";
import { ADVISORY_CATEGORIES, ADVISORY_SEVERITIES, advisories, diseases, regions, SPECIES, users } from "../db/schema.js";
import type { Deps } from "../deps.js";
import { badRequest, forbidden, notFound } from "../lib/errors.js";
import { describeRegions, regionAndAncestorIds, regionContains, requireRegion, withinRegion } from "../lib/regions.js";
import * as v from "../lib/validation.js";

type AdvisoryRow = typeof advisories.$inferSelect;

const translation = z.object({ title: v.text(200), body: v.text(4000) });

const advisoryFields = z.object({
  title: v.text(200),
  body: v.text(4000),
  translations: z.partialRecord(v.language, translation).default({}),
  severity: z.enum(ADVISORY_SEVERITIES).default("info"),
  category: z.enum(ADVISORY_CATEGORIES).default("general"),
  regionId: v.uuid.nullable().optional(),
  diseaseCode: z.string().max(40).nullable().optional(),
  species: z.array(z.enum(SPECIES)).max(9).nullable().optional(),
  expiresAt: v.isoDateTime.nullable().optional(),
});

/** Advisories reach everyone in the target region; staff also see those issued below their area. */
function advisoryVisibility(me: CurrentUser): SQL {
  if (me.role === "admin") return sql`true`;
  if (!me.region) return isNull(advisories.regionId);
  const conditions: (SQL | undefined)[] = [
    isNull(advisories.regionId),
    inArray(advisories.regionId, regionAndAncestorIds(me.region)),
  ];
  if (me.role !== "farmer") {
    conditions.push(
      sql`exists (select 1 from ${regions} where ${regions.id} = ${advisories.regionId} and ${withinRegion(regions, me.region)})`,
    );
  }
  return or(...conditions)!;
}

export function presentAdvisory(a: AdvisoryRow, lang: string | undefined) {
  const t = lang ? a.translations[lang] : undefined;
  return { ...a, localized: t ? { language: lang, ...t } : { language: "en", title: a.title, body: a.body } };
}

/** Check who may target a region: national advisories are for admins and national officials. */
async function checkTarget(db: Db, me: CurrentUser, regionId: string | null | undefined) {
  if (!regionId) {
    if (me.role === "admin" || me.region?.level === "country") return null;
    throw badRequest("Choose the region this advisory is for.", { field: "regionId" });
  }
  const region = await requireRegion(db, regionId);
  if (me.role !== "admin" && !(me.region && regionContains(me.region, region))) {
    throw forbidden("You can only issue advisories inside your area.");
  }
  return region;
}

export function advisoriesRouter(deps: Deps): Router {
  const { db } = deps;
  const router = Router();
  const issuers = requireRole("vet", "official", "admin");

  router.get("/", async (req, res) => {
    const me = currentUser(req);
    const q = v.pagination
      .extend({
        lang: v.language.optional(),
        category: v.queryList(z.enum(ADVISORY_CATEGORIES)),
        includeExpired: v.queryBool.default(false),
        mine: v.queryBool.optional(),
      })
      .parse(req.query);
    const rows = await db
      .select({ a: advisories, publisherName: users.fullName })
      .from(advisories)
      .innerJoin(users, eq(users.id, advisories.publishedById))
      .where(
        and(
          advisoryVisibility(me),
          q.category ? inArray(advisories.category, q.category) : undefined,
          q.includeExpired ? undefined : or(isNull(advisories.expiresAt), gt(advisories.expiresAt, sql`now()`)),
          q.mine ? eq(advisories.publishedById, me.id) : undefined,
        ),
      )
      .orderBy(
        sql`case ${advisories.severity} when 'high' then 0 when 'moderate' then 1 when 'low' then 2 else 3 end`,
        desc(advisories.publishedAt),
      )
      .limit(q.limit + 1)
      .offset(q.offset);
    const regionInfo = await describeRegions(db, rows.map((r) => r.a.regionId));
    const lang = q.lang ?? me.preferredLanguage;
    res.json(
      v.page(
        rows.map((r) => ({
          ...presentAdvisory(r.a, lang),
          region: r.a.regionId ? (regionInfo.get(r.a.regionId) ?? null) : null,
          publishedBy: { id: r.a.publishedById, fullName: r.publisherName },
        })),
        q,
      ),
    );
  });

  router.post("/", issuers, async (req, res) => {
    const me = currentUser(req);
    const body = advisoryFields.parse(req.body);
    const region = await checkTarget(db, me, body.regionId);
    if (body.diseaseCode) {
      const [d] = await db.select({ code: diseases.code }).from(diseases).where(eq(diseases.code, body.diseaseCode));
      if (!d) throw badRequest("Unknown disease code.", { field: "diseaseCode" });
    }
    const [row] = await db
      .insert(advisories)
      .values({
        ...body,
        regionId: region?.id ?? null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        publishedById: me.id,
      })
      .returning();
    res.status(201).json(presentAdvisory(row!, me.preferredLanguage));
  });

  async function loadOwn(me: CurrentUser, id: string) {
    const [row] = await db.select().from(advisories).where(and(eq(advisories.id, id), advisoryVisibility(me)));
    if (!row) throw notFound("Advisory");
    if (me.role !== "admin" && row.publishedById !== me.id) throw forbidden("Only the publisher can change this advisory.");
    return row;
  }

  router.patch("/:id", issuers, async (req, res) => {
    const me = currentUser(req);
    const row = await loadOwn(me, v.uuid.parse(req.params.id));
    const body = advisoryFields.partial().strict().parse(req.body);
    if (body.regionId !== undefined) await checkTarget(db, me, body.regionId);
    const [updated] = await db
      .update(advisories)
      .set({
        ...body,
        expiresAt: body.expiresAt === undefined ? undefined : body.expiresAt ? new Date(body.expiresAt) : null,
      })
      .where(eq(advisories.id, row.id))
      .returning();
    res.json(presentAdvisory(updated!, me.preferredLanguage));
  });

  router.delete("/:id", issuers, async (req, res) => {
    const me = currentUser(req);
    const row = await loadOwn(me, v.uuid.parse(req.params.id));
    await db.delete(advisories).where(eq(advisories.id, row.id));
    res.status(204).end();
  });

  return router;
}
