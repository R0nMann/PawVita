import { Router } from "express";
import { and, asc, eq, gte, inArray, lte, or } from "drizzle-orm";
import { z } from "zod";
import { currentUser, requireRole, type CurrentUser } from "../auth/middleware.js";
import type { Db } from "../db/client.js";
import { fieldVisits, herds, users, VISIT_STATUSES, VISIT_TYPES } from "../db/schema.js";
import type { Deps } from "../deps.js";
import { herdVisibility, loadVisibleCase, loadVisibleHerd } from "../lib/access.js";
import { badRequest, conflict, forbidden, notFound } from "../lib/errors.js";
import * as v from "../lib/validation.js";
import { markFirstResponse, recordCaseEvent } from "../services/case-workflow.js";
import { notify } from "../services/notifications.js";

type VisitStatus = (typeof VISIT_STATUSES)[number];

const VISIT_TRANSITIONS: Record<VisitStatus, readonly VisitStatus[]> = {
  scheduled: ["in_progress", "completed", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

const visibility = (me: CurrentUser) => or(eq(fieldVisits.vetId, me.id), herdVisibility(me));

function formatWhen(d: Date) {
  return d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
}

async function loadVisit(db: Db, me: CurrentUser, id: string) {
  const [row] = await db
    .select({ visit: fieldVisits, herdName: herds.name, ownerId: herds.ownerId })
    .from(fieldVisits)
    .innerJoin(herds, eq(herds.id, fieldVisits.herdId))
    .where(and(eq(fieldVisits.id, id), visibility(me)));
  if (!row) throw notFound("Visit");
  return row;
}

/** Field visits — investigations, follow-ups and vaccination camps (§9 "Treatment & Follow-Up"). */
export function visitsRouter(deps: Deps): Router {
  const { db } = deps;
  const router = Router();

  router.get("/", async (req, res) => {
    const me = currentUser(req);
    const q = v.pagination
      .extend({
        from: v.isoDateTime.optional(),
        to: v.isoDateTime.optional(),
        status: v.queryList(z.enum(VISIT_STATUSES)),
        vetId: v.uuid.optional(),
        caseId: v.uuid.optional(),
        herdId: v.uuid.optional(),
        mine: v.queryBool.optional(),
      })
      .parse(req.query);
    const rows = await db
      .select({
        visit: fieldVisits,
        herdName: herds.name,
        lat: herds.lat,
        lng: herds.lng,
        address: herds.address,
        vetName: users.fullName,
      })
      .from(fieldVisits)
      .innerJoin(herds, eq(herds.id, fieldVisits.herdId))
      .innerJoin(users, eq(users.id, fieldVisits.vetId))
      .where(
        and(
          visibility(me),
          q.from ? gte(fieldVisits.scheduledAt, new Date(q.from)) : undefined,
          q.to ? lte(fieldVisits.scheduledAt, new Date(q.to)) : undefined,
          q.status ? inArray(fieldVisits.status, q.status) : undefined,
          q.vetId ? eq(fieldVisits.vetId, q.vetId) : undefined,
          q.mine ? eq(fieldVisits.vetId, me.id) : undefined,
          q.caseId ? eq(fieldVisits.caseId, q.caseId) : undefined,
          q.herdId ? eq(fieldVisits.herdId, q.herdId) : undefined,
        ),
      )
      .orderBy(asc(fieldVisits.scheduledAt), asc(fieldVisits.id))
      .limit(q.limit + 1)
      .offset(q.offset);
    res.json(
      v.page(
        rows.map((r) => ({
          ...r.visit,
          herd: { id: r.visit.herdId, name: r.herdName, lat: r.lat, lng: r.lng, address: r.address },
          vet: { id: r.visit.vetId, fullName: r.vetName },
        })),
        q,
      ),
    );
  });

  router.post("/", requireRole("vet", "official", "admin"), async (req, res) => {
    const me = currentUser(req);
    const body = z
      .object({
        caseId: v.uuid.optional(),
        herdId: v.uuid.optional(),
        vetId: v.uuid.optional(),
        type: z.enum(VISIT_TYPES).default("follow_up"),
        scheduledAt: v.isoDateTime,
        purpose: v.text(300).optional(),
      })
      .refine((b) => b.caseId || b.herdId, { message: "Give a caseId or herdId.", path: ["herdId"] })
      .parse(req.body);

    const c = body.caseId ? await loadVisibleCase(db, me, body.caseId) : null;
    const herdId = body.herdId ?? c!.herdId;
    if (c && body.herdId && body.herdId !== c.herdId) throw badRequest("The herd does not match the case.");
    const herd = await loadVisibleHerd(db, me, herdId);

    const vetId = body.vetId ?? (me.role === "vet" ? me.id : undefined);
    if (!vetId) throw badRequest("Choose the vet making the visit.", { field: "vetId" });
    if (me.role === "vet" && vetId !== me.id) throw forbidden("Vets schedule their own visits.");
    const [vet] = await db
      .select({ id: users.id, fullName: users.fullName })
      .from(users)
      .where(and(eq(users.id, vetId), eq(users.role, "vet"), eq(users.status, "active")));
    if (!vet) throw badRequest("Choose an active veterinarian.", { field: "vetId" });

    const scheduledAt = new Date(body.scheduledAt);
    const visit = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(fieldVisits)
        .values({
          caseId: c?.id,
          herdId,
          vetId,
          type: body.type,
          scheduledAt,
          purpose: body.purpose,
          createdById: me.id,
        })
        .returning();
      const text = `${vet.fullName} will visit ${herd.name} on ${formatWhen(scheduledAt)}${body.purpose ? ` — ${body.purpose}` : ""}.`;
      if (c) {
        await recordCaseEvent(tx, {
          caseId: c.id,
          type: "visit_scheduled",
          actorId: me.id,
          body: text,
          data: { visitId: row!.id, scheduledAt },
          visibleToReporter: true,
        });
        await markFirstResponse(tx, c.id, me);
      }
      await notify(tx, [herd.ownerId], { type: "visit", title: "Vet visit scheduled", body: text, data: { visitId: row!.id, caseId: c?.id } }, { exclude: me.id });
      await notify(tx, [vetId], { type: "visit", title: "Visit assigned to you", body: text, data: { visitId: row!.id, caseId: c?.id } }, { exclude: me.id });
      return row!;
    });
    res.status(201).json(visit);
  });

  router.patch("/:id", requireRole("vet", "official", "admin"), async (req, res) => {
    const me = currentUser(req);
    const body = z
      .object({
        status: z.enum(VISIT_STATUSES).optional(),
        scheduledAt: v.isoDateTime.optional(),
        purpose: v.text(300).nullable().optional(),
        notes: v.text(4000).nullable().optional(),
      })
      .strict()
      .refine(v.hasChanges, v.nothingToChange)
      .parse(req.body);
    const { visit, herdName, ownerId } = await loadVisit(db, me, v.uuid.parse(req.params.id));
    if (me.role !== "admin" && visit.vetId !== me.id && visit.createdById !== me.id) {
      throw forbidden("Only the visiting vet or whoever scheduled the visit can change it.");
    }
    if (body.status && body.status !== visit.status && !VISIT_TRANSITIONS[visit.status].includes(body.status)) {
      throw conflict(`A visit cannot go from ${visit.status} to ${body.status}.`);
    }
    if (body.scheduledAt && visit.status !== "scheduled") throw conflict("Only a scheduled visit can be moved.");

    const updated = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(fieldVisits)
        .set({
          ...body,
          scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
          completedAt: body.status === "completed" ? new Date() : undefined,
        })
        .where(eq(fieldVisits.id, visit.id))
        .returning();
      if (body.scheduledAt || body.status === "cancelled") {
        await notify(
          tx,
          [ownerId],
          {
            type: "visit",
            title: body.status === "cancelled" ? "Vet visit cancelled" : "Vet visit rescheduled",
            body:
              body.status === "cancelled"
                ? `The visit to ${herdName} has been cancelled.`
                : `The visit to ${herdName} is now on ${formatWhen(new Date(body.scheduledAt!))}.`,
            data: { visitId: visit.id, caseId: visit.caseId },
          },
          { exclude: me.id },
        );
      }
      return row!;
    });
    res.json(updated);
  });

  return router;
}
