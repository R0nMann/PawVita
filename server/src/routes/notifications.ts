import { Router } from "express";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { currentUser } from "../auth/middleware.js";
import { notifications } from "../db/schema.js";
import type { Deps } from "../deps.js";
import { notFound } from "../lib/errors.js";
import * as v from "../lib/validation.js";

export function notificationsRouter(deps: Deps): Router {
  const { db } = deps;
  const router = Router();

  router.get("/", async (req, res) => {
    const me = currentUser(req);
    const q = v.pagination.extend({ unread: v.queryBool.optional() }).parse(req.query);
    const mine = eq(notifications.userId, me.id);
    const [rows, [counts]] = await Promise.all([
      db
        .select()
        .from(notifications)
        .where(and(mine, q.unread ? isNull(notifications.readAt) : undefined))
        .orderBy(desc(notifications.createdAt), desc(notifications.id))
        .limit(q.limit + 1)
        .offset(q.offset),
      db
        .select({ unread: sql<number>`count(*)::int` })
        .from(notifications)
        .where(and(mine, isNull(notifications.readAt))),
    ]);
    res.json({ ...v.page(rows.map(({ dedupeKey: _key, ...n }) => n), q), unreadCount: counts?.unread ?? 0 });
  });

  router.post("/read-all", async (req, res) => {
    const me = currentUser(req);
    const updated = await db
      .update(notifications)
      .set({ readAt: sql`now()` })
      .where(and(eq(notifications.userId, me.id), isNull(notifications.readAt)))
      .returning({ id: notifications.id });
    res.json({ updated: updated.length });
  });

  router.post("/:id/read", async (req, res) => {
    const me = currentUser(req);
    const id = v.uuid.parse(req.params.id);
    const [row] = await db
      .update(notifications)
      .set({ readAt: sql`coalesce(${notifications.readAt}, now())` })
      .where(and(eq(notifications.id, id), eq(notifications.userId, me.id)))
      .returning();
    if (!row) throw notFound("Notification");
    const { dedupeKey: _key, ...n } = row;
    res.json(n);
  });

  return router;
}
