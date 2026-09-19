import { Router } from "express";
import { and, eq, gte, inArray, isNotNull, lte, ne, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { z } from "zod";
import { currentUser, requireRole, type CurrentUser } from "../auth/middleware.js";
import { queryRows, type Db } from "../db/client.js";
import { animals, cases, diseases, herds, mortalityRecords, regions, REGION_LEVELS, SPECIES } from "../db/schema.js";
import type { Deps } from "../deps.js";
import { badRequest, forbidden } from "../lib/errors.js";
import {
  columnForLevel,
  LEVEL_DEPTH,
  regionContains,
  requireRegion,
  withinRegion,
  type RegionLevel,
  type RegionRef,
} from "../lib/regions.js";
import * as v from "../lib/validation.js";

/**
 * Population-level outbreak intelligence (architecture §11): individual cases
 * rolled up village → block → district → state for risk maps, trend charts
 * and vaccination-gap monitoring. Plain aggregation — cluster detection and
 * forecasting belong to the future AI layer.
 */

const CHILD_LEVEL: Partial<Record<RegionLevel, RegionLevel>> = {
  country: "state",
  state: "district",
  district: "block",
  block: "village",
};

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return isoDay(d);
}

/** The area a request covers: the requested region if the user may see it, else their own. */
async function resolveScope(db: Db, me: CurrentUser, regionId?: string): Promise<RegionRef | null> {
  if (regionId) {
    const region = await requireRegion(db, regionId);
    if (me.role !== "admin" && !(me.region && regionContains(me.region, region))) {
      throw forbidden("That region is outside your area.");
    }
    return region;
  }
  if (me.role === "admin") return me.region;
  if (!me.region) throw forbidden("Your account has no area assigned. Ask an administrator.");
  return me.region;
}

const inScope = (cols: Parameters<typeof withinRegion>[0], scope: RegionRef | null): SQL =>
  scope ? withinRegion(cols, scope) : sql`true`;

const period = z.object({
  regionId: v.uuid.optional(),
  from: v.isoDate.optional(),
  to: v.isoDate.optional(),
});

/** Inclusive calendar-day window, interpreted in India time. */
function window(from: string, to: string, column: AnyPgColumn) {
  if (from > to) throw badRequest("`from` must be on or before `to`.");
  return and(
    sql`${column} >= (${from}::date)::timestamp at time zone 'Asia/Kolkata'`,
    sql`${column} < (${to}::date + 1)::timestamp at time zone 'Asia/Kolkata'`,
  );
}

export function analyticsRouter(deps: Deps): Router {
  const { db } = deps;
  const router = Router();
  router.use(requireRole("official", "vet", "admin"));

  /** Headline numbers for the Overview dashboard. */
  router.get("/overview", async (req, res) => {
    const me = currentUser(req);
    const q = period.parse(req.query);
    const to = q.to ?? isoDay(new Date());
    const from = q.from ?? daysAgo(29);
    const scope = await resolveScope(db, me, q.regionId);
    const caseScope = inScope(cases, scope);
    const open = ne(cases.status, "resolved");

    const [reported] = await db
      .select({
        reported: sql<number>`count(*)::int`,
        offline: sql<number>`count(*) filter (where ${cases.capturedOffline})::int`,
        avgResponseHours: sql<number | null>`round((avg(extract(epoch from ${cases.firstResponseAt} - ${cases.createdAt})) / 3600)::numeric, 1)::float8`,
        medianResponseHours: sql<number | null>`round((percentile_cont(0.5) within group (order by extract(epoch from ${cases.firstResponseAt} - ${cases.createdAt})) / 3600)::numeric, 1)::float8`,
      })
      .from(cases)
      .where(and(caseScope, window(from, to, cases.createdAt)));
    const [resolved] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(cases)
      .where(and(caseScope, isNotNull(cases.resolvedAt), window(from, to, cases.resolvedAt)));
    const byStatus = await db
      .select({ status: cases.status, n: sql<number>`count(*)::int` })
      .from(cases)
      .where(and(caseScope, open))
      .groupBy(cases.status);
    const byRisk = await db
      .select({ risk: sql<string>`coalesce(${cases.riskLevel}::text, 'unassessed')`, n: sql<number>`count(*)::int` })
      .from(cases)
      .where(and(caseScope, open))
      .groupBy(sql`1`);
    const [notifiable] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(cases)
      .innerJoin(diseases, sql`${diseases.code} = coalesce(${cases.confirmedDiseaseCode}, ${cases.suspectedDiseaseCode})`)
      .where(and(caseScope, open, eq(diseases.notifiable, true)));
    const [deaths] = await db
      .select({ n: sql<number>`coalesce(sum(${mortalityRecords.count}), 0)::int` })
      .from(mortalityRecords)
      .innerJoin(herds, eq(herds.id, mortalityRecords.herdId))
      .where(and(inScope(herds, scope), gte(mortalityRecords.diedOn, from), lte(mortalityRecords.diedOn, to)));
    const [herdStats] = await db
      .select({
        animals: sql<number>`count(${animals.id}) filter (where ${animals.status} not in ('dead', 'sold'))::int`,
        herds: sql<number>`count(distinct ${herds.id})::int`,
      })
      .from(herds)
      .leftJoin(animals, eq(animals.herdId, herds.id))
      .where(inScope(herds, scope));
    const coverage = await vaccinationCoverage(db, scope, null, undefined);
    const totals = coverage.reduce(
      (acc, r) => ({ animals: acc.animals + r.animals, upToDate: acc.upToDate + r.upToDate, overdue: acc.overdue + r.overdue }),
      { animals: 0, upToDate: 0, overdue: 0 },
    );

    const openByStatus = Object.fromEntries(byStatus.map((r) => [r.status, r.n]));
    res.json({
      scope: scope ? { id: scope.id, name: scope.name, level: scope.level } : null,
      period: { from, to },
      cases: {
        reported: reported?.reported ?? 0,
        reportedOffline: reported?.offline ?? 0,
        resolved: resolved?.n ?? 0,
        open: byStatus.reduce((s, r) => s + r.n, 0),
        openByStatus,
        openByRisk: Object.fromEntries(byRisk.map((r) => [r.risk, r.n])),
        openNotifiable: notifiable?.n ?? 0,
      },
      responseTimeHours: { average: reported?.avgResponseHours ?? null, median: reported?.medianResponseHours ?? null },
      deaths: deaths?.n ?? 0,
      herds: herdStats?.herds ?? 0,
      animals: herdStats?.animals ?? 0,
      vaccination: {
        ...totals,
        coveragePercent: totals.animals ? Math.round((totals.upToDate / totals.animals) * 1000) / 10 : null,
      },
    });
  });

  /** Case counts per child region — the disease-risk map (§11). */
  router.get("/regions", async (req, res) => {
    const me = currentUser(req);
    const q = period
      .extend({
        level: z.enum(REGION_LEVELS).optional(),
        diseaseCode: z.string().max(40).optional(),
        species: z.enum(SPECIES).optional(),
      })
      .parse(req.query);
    const to = q.to ?? isoDay(new Date());
    const from = q.from ?? daysAgo(29);
    const scope = await resolveScope(db, me, q.regionId);
    const level = q.level ?? CHILD_LEVEL[scope?.level ?? "country"];
    if (!level || level === "country" || (scope && LEVEL_DEPTH[level] <= LEVEL_DEPTH[scope.level])) {
      throw badRequest("Choose a level below the selected region.", { field: "level" });
    }
    const col = columnForLevel(cases, level)!;
    const rows = await db
      .select({
        regionId: sql<string>`${col}`,
        cases: sql<number>`count(*)::int`,
        open: sql<number>`count(*) filter (where ${cases.status} <> 'resolved')::int`,
        highRiskOpen: sql<number>`count(*) filter (where ${cases.status} <> 'resolved' and ${cases.riskLevel} = 'high')::int`,
        animalsAffected: sql<number>`coalesce(sum(${cases.animalsAffected}), 0)::int`,
        deaths: sql<number>`coalesce(sum(${cases.animalsDead}), 0)::int`,
      })
      .from(cases)
      .leftJoin(animals, eq(animals.id, cases.animalId))
      .where(
        and(
          inScope(cases, scope),
          isNotNull(col),
          window(from, to, cases.createdAt),
          q.diseaseCode
            ? sql`coalesce(${cases.confirmedDiseaseCode}, ${cases.suspectedDiseaseCode}) = ${q.diseaseCode}`
            : undefined,
          q.species ? eq(animals.species, q.species) : undefined,
        ),
      )
      .groupBy(col);
    const info = rows.length
      ? await db
          .select({ id: regions.id, name: regions.name, code: regions.code, lat: regions.lat, lng: regions.lng })
          .from(regions)
          .where(inArray(regions.id, rows.map((r) => r.regionId)))
      : [];
    const byId = new Map(info.map((r) => [r.id, r]));
    res.json({
      scope: scope ? { id: scope.id, name: scope.name, level: scope.level } : null,
      level,
      period: { from, to },
      items: rows
        .map((r) => ({ ...r, region: byId.get(r.regionId) ?? { id: r.regionId } }))
        .sort((a, b) => b.open - a.open || b.cases - a.cases),
    });
  });

  /** Cases (or deaths) per day/week/month, optionally split by disease, species or status. */
  router.get("/trends", async (req, res) => {
    const me = currentUser(req);
    const q = period
      .extend({
        interval: z.enum(["day", "week", "month"]).default("month"),
        metric: z.enum(["cases", "deaths"]).default("cases"),
        groupBy: z.enum(["none", "disease", "species", "status"]).default("none"),
      })
      .parse(req.query);
    const to = q.to ?? isoDay(new Date());
    const from = q.from ?? daysAgo(q.interval === "day" ? 29 : q.interval === "week" ? 83 : 179);
    const scope = await resolveScope(db, me, q.regionId);
    // Validated enum, inlined so SELECT and GROUP BY render the identical expression.
    const unit = sql.raw(`'${q.interval}'`);

    let rows: { bucket: string; key: string; n: number }[];
    if (q.metric === "deaths") {
      if (q.groupBy !== "none" && q.groupBy !== "species") throw badRequest("Deaths can be grouped by species only.");
      const bucket = sql<string>`to_char(date_trunc(${unit}, ${mortalityRecords.diedOn}::timestamp), 'YYYY-MM-DD')`;
      const key =
        q.groupBy === "species" ? sql<string>`coalesce(${animals.species}::text, 'unspecified')` : sql<string>`'total'`;
      rows = await db
        .select({ bucket, key, n: sql<number>`coalesce(sum(${mortalityRecords.count}), 0)::int` })
        .from(mortalityRecords)
        .innerJoin(herds, eq(herds.id, mortalityRecords.herdId))
        .leftJoin(animals, eq(animals.id, mortalityRecords.animalId))
        .where(and(inScope(herds, scope), gte(mortalityRecords.diedOn, from), lte(mortalityRecords.diedOn, to)))
        .groupBy(...(q.groupBy === "none" ? [bucket] : [bucket, key]))
        .orderBy(bucket);
    } else {
      const bucket = sql<string>`to_char(date_trunc(${unit}, ${cases.createdAt} at time zone 'Asia/Kolkata'), 'YYYY-MM-DD')`;
      const key =
        q.groupBy === "disease"
          ? sql<string>`coalesce(${cases.confirmedDiseaseCode}, ${cases.suspectedDiseaseCode}, 'undiagnosed')`
          : q.groupBy === "species"
            ? sql<string>`coalesce(${animals.species}::text, 'unspecified')`
            : q.groupBy === "status"
              ? sql<string>`${cases.status}::text`
              : sql<string>`'total'`;
      rows = await db
        .select({ bucket, key, n: sql<number>`count(*)::int` })
        .from(cases)
        .leftJoin(animals, eq(animals.id, cases.animalId))
        .where(and(inScope(cases, scope), window(from, to, cases.createdAt)))
        .groupBy(...(q.groupBy === "none" ? [bucket] : [bucket, key]))
        .orderBy(bucket);
    }

    // Pivot into one row per bucket — the shape charting libraries expect.
    const keys = [...new Set(rows.map((r) => r.key))].sort();
    const buckets = new Map<string, { start: string; total: number; counts: Record<string, number> }>();
    for (const r of rows) {
      const b = buckets.get(r.bucket) ?? { start: r.bucket, total: 0, counts: {} };
      b.counts[r.key] = r.n;
      b.total += r.n;
      buckets.set(r.bucket, b);
    }
    res.json({
      scope: scope ? { id: scope.id, name: scope.name, level: scope.level } : null,
      period: { from, to },
      interval: q.interval,
      metric: q.metric,
      groupBy: q.groupBy,
      keys,
      buckets: [...buckets.values()],
    });
  });

  /** Vaccination gaps per child region (§2 "Vaccination-Gap Monitoring"). */
  router.get("/vaccination-coverage", async (req, res) => {
    const me = currentUser(req);
    const q = z
      .object({
        regionId: v.uuid.optional(),
        level: z.enum(REGION_LEVELS).optional(),
        vaccineCode: z.string().max(40).optional(),
      })
      .parse(req.query);
    const scope = await resolveScope(db, me, q.regionId);
    const level = q.level ?? CHILD_LEVEL[scope?.level ?? "country"];
    if (!level || level === "country" || (scope && LEVEL_DEPTH[level] <= LEVEL_DEPTH[scope.level])) {
      throw badRequest("Choose a level below the selected region.", { field: "level" });
    }
    const rows = await vaccinationCoverage(db, scope, level, q.vaccineCode);
    const info = rows.length
      ? await db
          .select({ id: regions.id, name: regions.name, lat: regions.lat, lng: regions.lng })
          .from(regions)
          .where(inArray(regions.id, rows.map((r) => r.regionId!).filter(Boolean)))
      : [];
    const byId = new Map(info.map((r) => [r.id, r]));
    res.json({
      scope: scope ? { id: scope.id, name: scope.name, level: scope.level } : null,
      level,
      vaccineCode: q.vaccineCode ?? null,
      items: rows
        .filter((r) => r.regionId)
        .map((r) => ({
          ...r,
          region: byId.get(r.regionId!) ?? { id: r.regionId },
          coveragePercent: r.animals ? Math.round((r.upToDate / r.animals) * 1000) / 10 : null,
        }))
        .sort((a, b) => (a.coveragePercent ?? 101) - (b.coveragePercent ?? 101)),
    });
  });

  /** Case counts by species — the species-distribution chart. */
  router.get("/species", async (req, res) => {
    const me = currentUser(req);
    const q = period.parse(req.query);
    const to = q.to ?? isoDay(new Date());
    const from = q.from ?? daysAgo(29);
    const scope = await resolveScope(db, me, q.regionId);
    const species = sql<string>`coalesce(${animals.species}::text, 'unspecified')`;
    const rows = await db
      .select({ species, cases: sql<number>`count(*)::int`, animalsAffected: sql<number>`coalesce(sum(${cases.animalsAffected}), 0)::int` })
      .from(cases)
      .leftJoin(animals, eq(animals.id, cases.animalId))
      .where(and(inScope(cases, scope), window(from, to, cases.createdAt)))
      .groupBy(species);
    res.json({ period: { from, to }, items: rows.sort((a, b) => b.cases - a.cases) });
  });

  return router;
}

interface CoverageRow {
  regionId: string | null;
  animals: number;
  upToDate: number;
  overdue: number;
  neverVaccinated: number;
}

/**
 * Per region: live animals, how many are fully up to date (at least one
 * vaccination, none overdue), overdue, and never vaccinated. With a vaccine
 * code, only that vaccine counts. `level` null → a single scope-wide row.
 */
export async function vaccinationCoverage(
  db: Db,
  scope: RegionRef | null,
  level: RegionLevel | null,
  vaccineCode: string | undefined,
): Promise<CoverageRow[]> {
  const groupCol = level ? sql.raw(`h.${level}_id`) : sql`null::uuid`;
  const scopeCol = scope && scope.level !== "country" ? sql.raw(`h.${scope.level}_id`) : null;
  return queryRows<CoverageRow>(
    db,
    sql`
      with latest as (
        select distinct on (v.animal_id, v.vaccine_code) v.animal_id, v.next_due_on
        from pawvita.vaccinations v
        ${vaccineCode ? sql`where v.vaccine_code = ${vaccineCode}` : sql``}
        order by v.animal_id, v.vaccine_code, v.administered_on desc, v.created_at desc
      ), per_animal as (
        select animal_id, bool_or(next_due_on < current_date) as any_overdue
        from latest group by animal_id
      )
      select ${groupCol} as "regionId",
        count(a.id)::int as "animals",
        count(pa.animal_id) filter (where not pa.any_overdue)::int as "upToDate",
        count(pa.animal_id) filter (where pa.any_overdue)::int as "overdue",
        count(a.id) filter (where pa.animal_id is null)::int as "neverVaccinated"
      from pawvita.animals a
      join pawvita.herds h on h.id = a.herd_id
      left join per_animal pa on pa.animal_id = a.id
      where a.status not in ('dead', 'sold')
        ${scopeCol ? sql`and ${scopeCol} = ${scope!.id}` : sql``}
      group by 1
    `,
  );
}
