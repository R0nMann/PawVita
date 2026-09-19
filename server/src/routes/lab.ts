import { Router } from "express";
import { and, asc, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";
import { currentUser, requireRole, type CurrentUser } from "../auth/middleware.js";
import type { Db } from "../db/client.js";
import {
  animals,
  attachments,
  cases,
  diseases,
  LAB_PRIORITIES,
  LAB_RESULTS,
  LAB_STATUSES,
  labRequests,
  organizations,
  users,
} from "../db/schema.js";
import type { Deps } from "../deps.js";
import { caseVisibility } from "../lib/access.js";
import { badRequest, conflict, forbidden, notFound } from "../lib/errors.js";
import * as v from "../lib/validation.js";
import { presentAttachments } from "../services/case-queries.js";
import { recordCaseEvent, releaseFromLabIfDone } from "../services/case-workflow.js";
import { notify, reporterSideIds, staffCovering } from "../services/notifications.js";

type LabStatus = (typeof LAB_STATUSES)[number];

/** Samples only move forward; `rejected` ends the request from any open state. */
const STATUS_ORDER: Record<LabStatus, number> = {
  requested: 0,
  collected: 1,
  received: 2,
  processing: 3,
  completed: 4,
  rejected: 4,
};

/** Lab technicians see their laboratory's queue; everyone else sees samples on cases they can see. */
export function labVisibility(me: CurrentUser): SQL {
  if (me.role === "lab_tech") {
    return me.organizationId ? eq(labRequests.labOrgId, me.organizationId) : sql`false`;
  }
  return sql`exists (select 1 from ${cases} where ${cases.id} = ${labRequests.caseId} and ${caseVisibility(me)})`;
}

export async function loadVisibleLabRequest(db: Db, me: CurrentUser, id: string) {
  const [row] = await db
    .select()
    .from(labRequests)
    .where(and(eq(labRequests.id, id), labVisibility(me)));
  if (!row) throw notFound("Lab request");
  return row;
}

function assertLabStaff(me: CurrentUser, r: typeof labRequests.$inferSelect) {
  if (me.role === "admin") return;
  if (me.role !== "lab_tech" || me.organizationId !== r.labOrgId) {
    throw forbidden("Only the receiving laboratory can update this sample.");
  }
}

export function labRouter(deps: Deps): Router {
  const { db } = deps;
  const router = Router();

  /** The laboratory queue (hospital portal "Lab Tech" and user portal "Lab"). */
  router.get("/", requireRole("lab_tech", "vet", "official", "admin"), async (req, res) => {
    const me = currentUser(req);
    const q = v.pagination
      .extend({
        status: v.queryList(z.enum(LAB_STATUSES)),
        priority: v.queryList(z.enum(LAB_PRIORITIES)),
        caseId: v.uuid.optional(),
        requestedByMe: v.queryBool.optional(),
        sort: z.enum(["priority", "recent"]).default("priority"),
      })
      .parse(req.query);
    const requester = alias(users, "requester");
    const rows = await db
      .select({
        r: labRequests,
        caseNumber: cases.caseNumber,
        suspectedDiseaseCode: cases.suspectedDiseaseCode,
        districtId: cases.districtId,
        animalName: animals.name,
        species: animals.species,
        tagNumber: animals.tagNumber,
        requesterName: requester.fullName,
        labName: organizations.name,
      })
      .from(labRequests)
      .innerJoin(cases, eq(cases.id, labRequests.caseId))
      .innerJoin(requester, eq(requester.id, labRequests.requestedById))
      .leftJoin(animals, eq(animals.id, labRequests.animalId))
      .leftJoin(organizations, eq(organizations.id, labRequests.labOrgId))
      .where(
        and(
          labVisibility(me),
          q.status ? inArray(labRequests.status, q.status) : undefined,
          q.priority ? inArray(labRequests.priority, q.priority) : undefined,
          q.caseId ? eq(labRequests.caseId, q.caseId) : undefined,
          q.requestedByMe ? eq(labRequests.requestedById, me.id) : undefined,
        ),
      )
      .orderBy(
        ...(q.sort === "priority"
          ? [
              sql`case ${labRequests.status} when 'completed' then 1 when 'rejected' then 1 else 0 end`,
              sql`case ${labRequests.priority} when 'urgent' then 0 when 'high' then 1 when 'normal' then 2 else 3 end`,
              asc(labRequests.createdAt),
            ]
          : [desc(labRequests.createdAt)]),
        asc(labRequests.id),
      )
      .limit(q.limit + 1)
      .offset(q.offset);
    res.json(
      v.page(
        rows.map((row) => ({
          ...row.r,
          caseNumber: row.caseNumber,
          suspectedDiseaseCode: row.suspectedDiseaseCode,
          animal: row.r.animalId
            ? { id: row.r.animalId, name: row.animalName, species: row.species, tagNumber: row.tagNumber }
            : null,
          requestedBy: { id: row.r.requestedById, fullName: row.requesterName },
          labName: row.labName,
        })),
        q,
      ),
    );
  });

  router.get("/:id", async (req, res) => {
    const me = currentUser(req);
    const r = await loadVisibleLabRequest(db, me, v.uuid.parse(req.params.id));
    const [c] = await db
      .select({
        id: cases.id,
        caseNumber: cases.caseNumber,
        status: cases.status,
        suspectedDiseaseCode: cases.suspectedDiseaseCode,
      })
      .from(cases)
      .where(eq(cases.id, r.caseId));
    const [animal] = r.animalId
      ? await db
          .select({ id: animals.id, name: animals.name, species: animals.species, tagNumber: animals.tagNumber })
          .from(animals)
          .where(eq(animals.id, r.animalId))
      : [];
    const [lab] = r.labOrgId
      ? await db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, r.labOrgId))
      : [];
    const people = await db
      .select({ id: users.id, fullName: users.fullName, role: users.role })
      .from(users)
      .where(inArray(users.id, [r.requestedById, r.processedById].filter((x): x is string => !!x)));
    const files = await db.select().from(attachments).where(eq(attachments.labRequestId, r.id));
    const person = (id: string | null) => people.find((p) => p.id === id) ?? null;
    res.json({
      ...r,
      case: c ?? null,
      animal: animal ?? null,
      labName: lab?.name ?? null,
      requestedBy: person(r.requestedById),
      processedBy: person(r.processedById),
      attachments: await presentAttachments(deps.storage, files),
      // Chain of custody, as shown on the sample screen.
      custody: [
        { step: "requested", at: r.createdAt },
        { step: "collected", at: r.collectedAt },
        { step: "received", at: r.receivedAt },
        { step: "processing", at: r.processingStartedAt },
        { step: r.status === "rejected" ? "rejected" : "completed", at: r.completedAt },
      ],
    });
  });

  router.patch("/:id/status", requireRole("lab_tech", "vet", "admin"), async (req, res) => {
    const me = currentUser(req);
    const body = z
      .object({
        status: z.enum(["collected", "received", "processing", "rejected"]),
        rejectionReason: v.text(1000).optional(),
      })
      .refine((b) => b.status !== "rejected" || b.rejectionReason, {
        message: "Say why the sample was rejected.",
        path: ["rejectionReason"],
      })
      .parse(req.body);
    const r = await loadVisibleLabRequest(db, me, v.uuid.parse(req.params.id));
    // The vet in the field records collection; everything after happens at the lab.
    if (me.role === "vet") {
      if (body.status !== "collected") throw forbidden("Only the laboratory can update a sample after collection.");
    } else {
      assertLabStaff(me, r);
    }
    if (r.status === "completed" || r.status === "rejected") throw conflict(`This sample is already ${r.status}.`);
    if (STATUS_ORDER[body.status] <= STATUS_ORDER[r.status] && body.status !== "rejected") {
      throw conflict(`A sample cannot go from ${r.status} back to ${body.status}.`);
    }

    const now = new Date();
    const updated = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(labRequests)
        .set({
          status: body.status,
          ...(body.status === "collected" && { collectedAt: now }),
          ...(body.status === "received" && { receivedAt: now }),
          ...(body.status === "processing" && { processingStartedAt: now, receivedAt: r.receivedAt ?? now }),
          ...(body.status === "rejected" && { completedAt: now, rejectionReason: body.rejectionReason }),
          processedById: me.role === "lab_tech" ? me.id : r.processedById,
        })
        .where(and(eq(labRequests.id, r.id), eq(labRequests.status, r.status)))
        .returning();
      if (!row) throw conflict("The sample changed while you were editing it. Reload and retry.");
      await recordCaseEvent(tx, {
        caseId: r.caseId,
        type: "lab_status_changed",
        actorId: me.id,
        body:
          body.status === "rejected"
            ? `Sample ${r.requestNumber} was rejected by the laboratory: ${body.rejectionReason}`
            : `Sample ${r.requestNumber} ${body.status}.`,
        data: { labRequestId: r.id, status: body.status },
        visibleToReporter: body.status === "rejected",
      });
      if (body.status === "rejected") {
        await notify(tx, [r.requestedById], {
          type: "lab_result",
          title: `Sample ${r.requestNumber} rejected`,
          body: body.rejectionReason!,
          data: { labRequestId: r.id, caseId: r.caseId },
        });
        await releaseFromLabIfDone(tx, r.caseId);
      }
      return row;
    });
    res.json(updated);
  });

  /** Enter the diagnostic result; the vet, the farmer and (if notifiable) district officials are told. */
  router.post("/:id/result", requireRole("lab_tech", "admin"), async (req, res) => {
    const me = currentUser(req);
    const body = z
      .object({
        result: z.enum(LAB_RESULTS),
        resultDiseaseCode: z.string().max(40).optional(),
        summary: v.text(1000),
        details: v.text(8000).optional(),
      })
      .parse(req.body);
    const r = await loadVisibleLabRequest(db, me, v.uuid.parse(req.params.id));
    assertLabStaff(me, r);
    if (r.status === "completed" || r.status === "rejected") throw conflict(`This sample is already ${r.status}.`);
    let disease: { code: string; name: string; notifiable: boolean } | undefined;
    if (body.resultDiseaseCode) {
      [disease] = await db
        .select({ code: diseases.code, name: diseases.name, notifiable: diseases.notifiable })
        .from(diseases)
        .where(eq(diseases.code, body.resultDiseaseCode));
      if (!disease) throw badRequest("Unknown disease code.", { field: "resultDiseaseCode" });
    }

    const updated = await db.transaction(async (tx) => {
      const now = new Date();
      const [row] = await tx
        .update(labRequests)
        .set({
          status: "completed",
          result: body.result,
          resultDiseaseCode: body.resultDiseaseCode,
          resultSummary: body.summary,
          resultDetails: body.details,
          receivedAt: r.receivedAt ?? now,
          processingStartedAt: r.processingStartedAt ?? now,
          completedAt: now,
          processedById: me.id,
        })
        .where(and(eq(labRequests.id, r.id), eq(labRequests.status, r.status)))
        .returning();
      if (!row) throw conflict("The sample changed while you were editing it. Reload and retry.");

      const [c] = await tx.select().from(cases).where(eq(cases.id, r.caseId));
      const headline = `Lab result for ${r.requestNumber}: ${body.result.toUpperCase()}${disease ? ` (${disease.name})` : ""}`;
      await recordCaseEvent(tx, {
        caseId: r.caseId,
        type: "lab_result",
        actorId: me.id,
        body: `${headline}. ${body.summary}`,
        data: { labRequestId: r.id, result: body.result, resultDiseaseCode: body.resultDiseaseCode ?? null },
        visibleToReporter: true,
      });
      const message = { type: "lab_result" as const, title: headline, body: body.summary, data: { labRequestId: r.id, caseId: r.caseId } };
      await notify(tx, [r.requestedById, c!.assignedVetId], message, { exclude: me.id });
      await notify(tx, await reporterSideIds(tx, c!), { ...message, body: "Your laboratory result is ready. Your vet will advise you on next steps." });
      if (body.result === "positive" && disease?.notifiable) {
        await notify(tx, await staffCovering(tx, c!, "official"), {
          type: "lab_result",
          title: `Notifiable disease confirmed: ${disease.name}`,
          body: `Case ${c!.caseNumber} — ${body.summary}`,
          data: { labRequestId: r.id, caseId: r.caseId, diseaseCode: disease.code },
        });
      }
      await releaseFromLabIfDone(tx, r.caseId);
      return row;
    });
    res.json(updated);
  });

  return router;
}
