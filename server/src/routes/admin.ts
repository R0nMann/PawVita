import os from "node:os";
import { Router } from "express";
import { and, asc, desc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";
import { z } from "zod";
import { currentUser } from "../auth/middleware.js";
import { AuthError } from "../auth/provider.js";
import {
  ACCOUNT_STATUSES,
  aiAssessments,
  cases,
  organizations,
  ORGANIZATION_TYPES,
  REGION_LEVELS,
  regions,
  USER_ROLES,
  users,
} from "../db/schema.js";
import type { Deps } from "../deps.js";
import { badRequest, conflict, HttpError, notFound } from "../lib/errors.js";
import { describeRegions, requireRegion } from "../lib/regions.js";
import * as v from "../lib/validation.js";
import { runReminders } from "../services/jobs.js";
import { notify } from "../services/notifications.js";
import { insertRegion } from "../services/regions-admin.js";
import { loadAccount, presentUser } from "../services/users.js";

const orgCode = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9-]{2,39}$/, "3–40 characters: letters, digits or dashes.");

const username = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9._-]{2,39}$/);

const startedAt = Date.now();

/** Administrator console: users and approvals, organisations, regions, system health. */
export function adminRouter(deps: Deps): Router {
  const { db, auth } = deps;
  const router = Router();

  // --- Users ------------------------------------------------------------------

  router.get("/users", async (req, res) => {
    const q = v.pagination
      .extend({
        role: v.queryList(z.enum(USER_ROLES)),
        status: v.queryList(z.enum(ACCOUNT_STATUSES)),
        regionId: v.uuid.optional(),
        organizationId: v.uuid.optional(),
        q: z.string().trim().min(1).max(80).optional(),
      })
      .parse(req.query);
    const rows = await db
      .select()
      .from(users)
      .where(
        and(
          q.role ? inArray(users.role, q.role) : undefined,
          q.status ? inArray(users.status, q.status) : undefined,
          q.regionId ? eq(users.regionId, q.regionId) : undefined,
          q.organizationId ? eq(users.organizationId, q.organizationId) : undefined,
          q.q
            ? or(
                ilike(users.fullName, v.likePattern(q.q)),
                ilike(users.email, v.likePattern(q.q)),
                ilike(users.phone, v.likePattern(q.q)),
                ilike(users.username, v.likePattern(q.q)),
              )
            : undefined,
        ),
      )
      // Pending approvals first — they are what an admin opens this screen for.
      .orderBy(sql`case ${users.status} when 'pending' then 0 else 1 end`, desc(users.createdAt), asc(users.id))
      .limit(q.limit + 1)
      .offset(q.offset);
    const regionInfo = await describeRegions(db, rows.map((u) => u.regionId));
    res.json(
      v.page(
        rows.map((u) => ({ ...presentUser(u), region: u.regionId ? (regionInfo.get(u.regionId) ?? null) : null })),
        q,
      ),
    );
  });

  /** Create a staff account directly (already approved), with a login if contact details are given. */
  router.post("/users", async (req, res) => {
    const me = currentUser(req);
    const body = z
      .object({
        fullName: v.text(120),
        role: z.enum(USER_ROLES),
        email: v.email.optional(),
        phone: v.phone.optional(),
        username: username.optional(),
        password: z.string().min(8).max(128).optional(),
        organizationId: v.uuid.optional(),
        regionId: v.uuid.optional(),
        preferredLanguage: v.language.default("en"),
      })
      .refine((b) => !b.password || b.email, { message: "A password login needs an email.", path: ["password"] })
      .parse(req.body);
    if (body.regionId) await requireRegion(db, body.regionId);

    let authUserId: string | null = null;
    if (body.email || body.phone) {
      try {
        ({ authUserId } = await auth.adminCreateUser({ email: body.email, phone: body.phone, password: body.password }));
      } catch (err) {
        if (err instanceof AuthError) throw new HttpError(err.status === 401 ? 400 : err.status, err.code, err.message);
        throw err;
      }
    }
    try {
      const [created] = await db
        .insert(users)
        .values({
          authUserId,
          role: body.role,
          status: "active",
          fullName: body.fullName,
          email: body.email,
          phone: body.phone,
          username: body.username,
          organizationId: body.organizationId,
          regionId: body.regionId,
          preferredLanguage: body.preferredLanguage,
          createdById: me.id,
          approvedById: me.id,
          approvedAt: new Date(),
        })
        .returning();
      res.status(201).json({ user: await loadAccount(db, created!.id) });
    } catch (err) {
      if (authUserId) await auth.adminDeleteUser(authUserId).catch(() => {});
      throw err;
    }
  });

  router.patch("/users/:id", async (req, res) => {
    const me = currentUser(req);
    const id = v.uuid.parse(req.params.id);
    const body = z
      .object({
        fullName: v.text(120).optional(),
        role: z.enum(USER_ROLES).optional(),
        status: z.enum(ACCOUNT_STATUSES).optional(),
        username: username.nullable().optional(),
        organizationId: v.uuid.nullable().optional(),
        regionId: v.uuid.nullable().optional(),
        preferredLanguage: v.language.optional(),
      })
      .strict()
      .parse(req.body);
    if (id === me.id && ((body.role && body.role !== "admin") || (body.status && body.status !== "active"))) {
      throw conflict("You cannot demote or suspend your own account.");
    }
    if (body.regionId) await requireRegion(db, body.regionId);
    const [before] = await db.select().from(users).where(eq(users.id, id));
    if (!before) throw notFound("User");
    const approving = body.status === "active" && before.status === "pending";
    await db
      .update(users)
      .set({ ...body, ...(approving && { approvedById: me.id, approvedAt: new Date() }) })
      .where(eq(users.id, id));
    if (approving) await notifyApproved(id);
    res.json({ user: await loadAccount(db, id) });
  });

  router.post("/users/:id/approve", async (req, res) => {
    const me = currentUser(req);
    const id = v.uuid.parse(req.params.id);
    const body = z
      .object({ regionId: v.uuid.optional(), organizationId: v.uuid.optional() })
      .parse(req.body ?? {});
    if (body.regionId) await requireRegion(db, body.regionId);
    const [updated] = await db
      .update(users)
      .set({ status: "active", approvedById: me.id, approvedAt: new Date(), ...body })
      .where(and(eq(users.id, id), eq(users.status, "pending")))
      .returning({ id: users.id });
    if (!updated) {
      const [exists] = await db.select({ status: users.status }).from(users).where(eq(users.id, id));
      if (!exists) throw notFound("User");
      throw conflict(`This account is ${exists.status}, not pending.`);
    }
    await notifyApproved(id);
    res.json({ user: await loadAccount(db, id) });
  });

  async function notifyApproved(userId: string) {
    await notify(db, [userId], {
      type: "account",
      title: "Account approved",
      body: "Your PawVita account has been approved. You can now sign in.",
    });
  }

  // --- Organisations ----------------------------------------------------------

  const orgFields = z.object({
    type: z.enum(ORGANIZATION_TYPES),
    name: v.text(200),
    code: orgCode,
    regionId: v.uuid.nullable().optional(),
    address: v.text(500).nullable().optional(),
    phone: v.phone.nullable().optional(),
    email: v.email.nullable().optional(),
  });

  router.post("/organizations", async (req, res) => {
    const body = orgFields.parse(req.body);
    if (body.regionId) await requireRegion(db, body.regionId);
    const [row] = await db.insert(organizations).values(body).returning();
    res.status(201).json(row);
  });

  router.patch("/organizations/:id", async (req, res) => {
    const body = orgFields.partial().strict().parse(req.body);
    if (body.regionId) await requireRegion(db, body.regionId);
    const [row] = await db
      .update(organizations)
      .set(body)
      .where(eq(organizations.id, v.uuid.parse(req.params.id)))
      .returning();
    if (!row) throw notFound("Organisation");
    res.json(row);
  });

  // --- Regions ----------------------------------------------------------------

  router.post("/regions", async (req, res) => {
    const body = z
      .object({
        name: v.text(120),
        level: z.enum(REGION_LEVELS),
        parentId: v.uuid.nullable().optional(),
        code: z.string().trim().min(1).max(40).optional(),
        lat: v.latitude.optional(),
        lng: v.longitude.optional(),
      })
      .parse(req.body);
    res.status(201).json(await insertRegion(db, body));
  });

  router.patch("/regions/:id", async (req, res) => {
    const body = z
      .object({
        name: v.text(120).optional(),
        code: z.string().trim().min(1).max(40).nullable().optional(),
        lat: v.latitude.nullable().optional(),
        lng: v.longitude.nullable().optional(),
      })
      .strict()
      .parse(req.body);
    const [row] = await db.update(regions).set(body).where(eq(regions.id, v.uuid.parse(req.params.id))).returning();
    if (!row) throw notFound("Region");
    res.json(row);
  });

  /**
   * Bulk-load the location hierarchy, e.g. from the LGD directory. Rows are
   * matched on `code`; list parents before children. Existing codes have their
   * name and coordinates refreshed.
   */
  router.post("/regions/import", async (req, res) => {
    const body = z
      .object({
        regions: z
          .array(
            z.object({
              code: z.string().trim().min(1).max(40),
              name: v.text(120),
              level: z.enum(REGION_LEVELS),
              parentCode: z.string().trim().min(1).max(40).optional(),
              lat: v.latitude.optional(),
              lng: v.longitude.optional(),
            }),
          )
          .min(1)
          .max(5000),
      })
      .parse(req.body);
    const result = await db.transaction(async (tx) => {
      let created = 0;
      let updated = 0;
      const ids = new Map<string, string>();
      for (const [index, r] of body.regions.entries()) {
        const [existing] = await tx.select({ id: regions.id }).from(regions).where(eq(regions.code, r.code));
        if (existing) {
          await tx.update(regions).set({ name: r.name, lat: r.lat, lng: r.lng }).where(eq(regions.id, existing.id));
          ids.set(r.code, existing.id);
          updated++;
          continue;
        }
        let parentId: string | null = null;
        if (r.parentCode) {
          parentId = ids.get(r.parentCode) ?? null;
          if (!parentId) {
            const [p] = await tx.select({ id: regions.id }).from(regions).where(eq(regions.code, r.parentCode));
            if (!p) throw badRequest(`Row ${index}: unknown parentCode ${r.parentCode}.`);
            parentId = p.id;
          }
        }
        const row = await insertRegion(tx, { ...r, parentId });
        ids.set(r.code, row.id);
        created++;
      }
      return { created, updated };
    });
    res.json(result);
  });

  // --- Operations -------------------------------------------------------------

  /** Service status for the System Health screen. */
  router.get("/system-health", async (_req, res) => {
    const probe = async (fn: () => Promise<unknown>) => {
      const t = performance.now();
      try {
        await fn();
        return { status: "operational" as const, latencyMs: Math.round(performance.now() - t) };
      } catch (err) {
        return { status: "down" as const, latencyMs: null, error: err instanceof Error ? err.message : String(err) };
      }
    };
    const [database, storage] = await Promise.all([probe(() => deps.database.ping()), probe(() => deps.storage.ping())]);
    const [[pending], [open], [sync], [ai]] = await Promise.all([
      db.select({ n: sql<number>`count(*)::int` }).from(users).where(eq(users.status, "pending")),
      db.select({ n: sql<number>`count(*)::int` }).from(cases).where(ne(cases.status, "resolved")),
      db
        .select({
          count: sql<number>`count(*)::int`,
          avgDelayMinutes: sql<number | null>`round((avg(extract(epoch from ${cases.createdAt} - ${cases.reportedAt})) / 60)::numeric, 1)::float8`,
          maxDelayMinutes: sql<number | null>`round((max(extract(epoch from ${cases.createdAt} - ${cases.reportedAt})) / 60)::numeric, 1)::float8`,
        })
        .from(cases)
        .where(and(eq(cases.capturedOffline, true), sql`${cases.createdAt} > now() - interval '7 days'`)),
      db
        .select({
          pending: sql<number>`count(*) filter (where ${aiAssessments.status} = 'pending')::int`,
          failed: sql<number>`count(*) filter (where ${aiAssessments.status} = 'failed' and ${aiAssessments.requestedAt} > now() - interval '7 days')::int`,
        })
        .from(aiAssessments),
    ]);
    res.json({
      services: {
        api: { status: "operational", uptimeSeconds: Math.round((Date.now() - startedAt) / 1000) },
        database: { ...database, driver: deps.database.kind },
        storage: { ...storage, provider: deps.storage.name },
        auth: { status: "operational", provider: deps.auth.name },
        ai: { status: deps.ai.enabled ? "operational" : "not_configured", ...ai },
      },
      queues: {
        pendingRegistrations: pending?.n ?? 0,
        openCases: open?.n ?? 0,
        // Reports that were captured offline and delivered by background sync.
        offlineSyncLast7Days: sync,
      },
      runtime: {
        node: process.version,
        environment: deps.config.env,
        memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        loadAverage: os.loadavg(),
      },
    });
  });

  router.post("/jobs/reminders", async (_req, res) => {
    res.json(await runReminders(deps));
  });

  return router;
}
