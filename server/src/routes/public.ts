import { Router } from "express";
import { alias } from "drizzle-orm/pg-core";
import { and, desc, eq, gt, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { z } from "zod";
import { advisories, animals, cases, diseases, regions, users } from "../db/schema.js";
import type { Deps } from "../deps.js";
import { findRegion, regionAndAncestorIds } from "../lib/regions.js";
import * as v from "../lib/validation.js";
import { vaccinationCoverage } from "./analytics.js";
import { presentAdvisory } from "./advisories.js";

/**
 * Unauthenticated endpoints for the landing page: network totals, the
 * outbreak ticker and nationwide advisories. Aggregates only — nothing here
 * identifies a farmer, an animal or a case.
 */
export function publicRouter(deps: Deps): Router {
  const { db } = deps;
  const router = Router();

  router.use((_req, res, next) => {
    res.set("Cache-Control", "public, max-age=300");
    next();
  });

  router.get("/stats", async (_req, res) => {
    const [[people], [caseCounts], [animalCount], coverage] = await Promise.all([
      db
        .select({
          farmers: sql<number>`count(*) filter (where ${users.role} = 'farmer')::int`,
          vets: sql<number>`count(*) filter (where ${users.role} = 'vet' and ${users.status} = 'active')::int`,
        })
        .from(users),
      db
        .select({
          active: sql<number>`count(*) filter (where ${cases.status} <> 'resolved')::int`,
          resolved: sql<number>`count(*) filter (where ${cases.status} = 'resolved')::int`,
        })
        .from(cases),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(animals)
        .where(sql`${animals.status} not in ('dead', 'sold')`),
      vaccinationCoverage(db, null, null, undefined),
    ]);
    const totals = coverage.reduce((a, r) => ({ animals: a.animals + r.animals, upToDate: a.upToDate + r.upToDate }), {
      animals: 0,
      upToDate: 0,
    });
    res.json({
      registeredFarmers: people?.farmers ?? 0,
      vetOfficers: people?.vets ?? 0,
      activeCases: caseCounts?.active ?? 0,
      casesResolved: caseCounts?.resolved ?? 0,
      animalsMonitored: animalCount?.n ?? 0,
      vaccinationCoveragePercent: totals.animals ? Math.round((totals.upToDate / totals.animals) * 1000) / 10 : null,
    });
  });

  /** Open cases per district and disease over the last fortnight — the landing-page ticker. */
  router.get("/alerts", async (_req, res) => {
    const district = alias(regions, "district");
    const state = alias(regions, "state");
    const diseaseCode = sql<string>`coalesce(${cases.confirmedDiseaseCode}, ${cases.suspectedDiseaseCode})`;
    const rows = await db
      .select({
        district: district.name,
        state: state.name,
        diseaseCode,
        diseaseName: diseases.name,
        cases: sql<number>`count(*)::int`,
        highRisk: sql<number>`count(*) filter (where ${cases.riskLevel} = 'high')::int`,
        latest: sql<Date>`max(${cases.createdAt})`,
      })
      .from(cases)
      .innerJoin(district, eq(district.id, cases.districtId))
      .leftJoin(state, eq(state.id, cases.stateId))
      .leftJoin(diseases, eq(diseases.code, diseaseCode))
      .where(and(ne(cases.status, "resolved"), sql`${cases.createdAt} > now() - interval '14 days'`, sql`${diseaseCode} is not null`))
      .groupBy(district.name, state.name, diseaseCode, diseases.name)
      .orderBy(desc(sql`count(*) filter (where ${cases.riskLevel} = 'high')`), desc(sql`count(*)`))
      .limit(10);
    res.json({
      items: rows.map((r) => ({
        ...r,
        severity: r.highRisk > 0 ? "high" : r.cases >= 5 ? "moderate" : "low",
      })),
    });
  });

  /** National monthly case counts for the top diseases — the landing-page trend chart. */
  router.get("/trends", async (req, res) => {
    const { months } = z.object({ months: z.coerce.number().int().min(1).max(24).default(7) }).parse(req.query);
    const bucket = sql<string>`to_char(date_trunc('month', ${cases.createdAt} at time zone 'Asia/Kolkata'), 'YYYY-MM-DD')`;
    const disease = sql<string>`coalesce(${cases.confirmedDiseaseCode}, ${cases.suspectedDiseaseCode})`;
    const rows = await db
      .select({ bucket, disease, n: sql<number>`count(*)::int` })
      .from(cases)
      .where(
        and(
          sql`${disease} is not null`,
          sql`${cases.createdAt} >= date_trunc('month', now() at time zone 'Asia/Kolkata') - make_interval(months => ${months - 1})`,
        ),
      )
      .groupBy(bucket, disease)
      .orderBy(bucket);
    // Keep the chart readable: the three most reported diseases, the rest as "other".
    const totals = new Map<string, number>();
    for (const r of rows) totals.set(r.disease, (totals.get(r.disease) ?? 0) + r.n);
    const top = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([code]) => code);
    const keys = [...top, ...(totals.size > top.length ? ["other"] : [])];
    const buckets = new Map<string, Record<string, number>>();
    const start = new Date();
    start.setUTCDate(1);
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - i, 1));
      buckets.set(d.toISOString().slice(0, 10), Object.fromEntries(keys.map((k) => [k, 0])));
    }
    for (const r of rows) {
      const b = buckets.get(r.bucket);
      if (!b) continue;
      const key = top.includes(r.disease) ? r.disease : "other";
      b[key] = (b[key] ?? 0) + r.n;
    }
    res.json({ keys, buckets: [...buckets.entries()].map(([start, counts]) => ({ start, counts })) });
  });

  router.get("/advisories", async (req, res) => {
    const q = z.object({ regionId: v.uuid.optional(), lang: v.language.optional() }).parse(req.query);
    const region = q.regionId ? await findRegion(db, q.regionId) : undefined;
    const rows = await db
      .select()
      .from(advisories)
      .where(
        and(
          or(isNull(advisories.regionId), region ? inArray(advisories.regionId, regionAndAncestorIds(region)) : undefined),
          or(isNull(advisories.expiresAt), gt(advisories.expiresAt, sql`now()`)),
        ),
      )
      .orderBy(desc(advisories.publishedAt))
      .limit(20);
    res.json({ items: rows.map((a) => presentAdvisory(a, q.lang)) });
  });

  return router;
}
