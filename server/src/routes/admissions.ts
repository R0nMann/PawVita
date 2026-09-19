import { Router } from "express";
import { and, asc, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { z } from "zod";
import { currentUser, requireRole, type CurrentUser } from "../auth/middleware.js";
import { admissions, animals, cases, herds, organizations, users } from "../db/schema.js";
import type { Deps } from "../deps.js";
import { badRequest, conflict, forbidden, notFound } from "../lib/errors.js";
import * as v from "../lib/validation.js";
import { recordCaseEvent } from "../services/case-workflow.js";
import { notify } from "../services/notifications.js";

/** The hospital a user works for; admins name one explicitly. */
function hospitalOf(me: CurrentUser, requested?: string): string {
  if (me.role === "admin") {
    if (!requested) throw badRequest("Give the organizationId.", { field: "organizationId" });
    return requested;
  }
  if (!me.organizationId) throw forbidden("Your account is not linked to a hospital.");
  if (requested && requested !== me.organizationId) throw forbidden("You can only manage your own hospital's wards.");
  return me.organizationId;
}

/** Hospital ward stays — the hospital portal's "digital herd view". */
export function admissionsRouter(deps: Deps): Router {
  const { db } = deps;
  const router = Router();
  router.use(requireRole("ward_staff", "vet", "admin"));

  router.get("/", async (req, res) => {
    const me = currentUser(req);
    const q = v.pagination
      .extend({
        active: v.queryBool.default(true),
        ward: z.string().trim().max(60).optional(),
        organizationId: v.uuid.optional(),
      })
      .parse(req.query);
    const orgId = hospitalOf(me, q.organizationId);
    const rows = await db
      .select({
        admission: admissions,
        animal: {
          id: animals.id,
          herdId: animals.herdId,
          name: animals.name,
          tagNumber: animals.tagNumber,
          species: animals.species,
          breed: animals.breed,
          status: animals.status,
        },
        herdName: herds.name,
        ownerName: users.fullName,
        ownerPhone: users.phone,
        caseNumber: cases.caseNumber,
        caseStatus: cases.status,
        riskLevel: cases.riskLevel,
      })
      .from(admissions)
      .innerJoin(animals, eq(animals.id, admissions.animalId))
      .innerJoin(herds, eq(herds.id, animals.herdId))
      .innerJoin(users, eq(users.id, herds.ownerId))
      .leftJoin(cases, eq(cases.id, admissions.caseId))
      .where(
        and(
          eq(admissions.organizationId, orgId),
          q.active ? isNull(admissions.dischargedAt) : isNotNull(admissions.dischargedAt),
          q.ward ? eq(admissions.ward, q.ward) : undefined,
        ),
      )
      .orderBy(q.active ? asc(admissions.ward) : desc(admissions.dischargedAt), desc(admissions.admittedAt))
      .limit(q.limit + 1)
      .offset(q.offset);
    res.json(
      v.page(
        rows.map((r) => ({
          ...r.admission,
          animal: r.animal,
          owner: { fullName: r.ownerName, phone: r.ownerPhone, herdName: r.herdName },
          case: r.admission.caseId
            ? { id: r.admission.caseId, caseNumber: r.caseNumber, status: r.caseStatus, riskLevel: r.riskLevel }
            : null,
        })),
        q,
      ),
    );
  });

  router.post("/", async (req, res) => {
    const me = currentUser(req);
    const body = z
      .object({
        animalId: v.uuid.optional(),
        tagNumber: z.string().trim().min(3).max(40).optional(),
        ward: v.text(60),
        reason: v.text(1000).optional(),
        caseId: v.uuid.optional(),
        organizationId: v.uuid.optional(),
      })
      .refine((b) => b.animalId || b.tagNumber, { message: "Give animalId or tagNumber.", path: ["animalId"] })
      .parse(req.body);
    const orgId = hospitalOf(me, body.organizationId);
    const [org] = await db.select({ name: organizations.name, type: organizations.type }).from(organizations).where(eq(organizations.id, orgId));
    if (!org || org.type !== "hospital") throw badRequest("Admissions are for hospitals.");

    // The animal is physically at the hospital, so admission does not require prior visibility.
    const [animal] = await db
      .select({ id: animals.id, name: animals.name, status: animals.status, herdId: animals.herdId, ownerId: herds.ownerId })
      .from(animals)
      .innerJoin(herds, eq(herds.id, animals.herdId))
      .where(body.animalId ? eq(animals.id, body.animalId) : eq(animals.tagNumber, body.tagNumber!));
    if (!animal) throw notFound("Animal");
    if (animal.status === "dead") throw conflict("This animal is recorded as dead.");
    if (body.caseId) {
      const [c] = await db.select({ herdId: cases.herdId, animalId: cases.animalId }).from(cases).where(eq(cases.id, body.caseId));
      if (!c || c.herdId !== animal.herdId) throw badRequest("That case is not for this animal's herd.", { field: "caseId" });
    }
    const [open] = await db
      .select({ id: admissions.id })
      .from(admissions)
      .where(and(eq(admissions.animalId, animal.id), isNull(admissions.dischargedAt)));
    if (open) throw conflict("This animal is already admitted. Discharge it first.");

    const admission = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(admissions)
        .values({ animalId: animal.id, organizationId: orgId, ward: body.ward, reason: body.reason, caseId: body.caseId, admittedById: me.id })
        .returning();
      if (body.caseId) {
        // Referral follows the animal: the case now belongs to this hospital.
        await tx.update(cases).set({ assignedOrgId: orgId }).where(eq(cases.id, body.caseId));
        await recordCaseEvent(tx, {
          caseId: body.caseId,
          type: "note",
          actorId: me.id,
          body: `Admitted to ${org.name} (${body.ward}).`,
          data: { admissionId: row!.id },
          visibleToReporter: true,
        });
      }
      await notify(tx, [animal.ownerId], {
        type: "system",
        title: "Animal admitted to hospital",
        body: `${animal.name ?? "Your animal"} was admitted to ${org.name} (${body.ward}).`,
        data: { admissionId: row!.id, animalId: animal.id, caseId: body.caseId },
      });
      return row!;
    });
    res.status(201).json(admission);
  });

  async function loadOpen(me: CurrentUser, id: string) {
    const [row] = await db.select().from(admissions).where(eq(admissions.id, id));
    if (!row) throw notFound("Admission");
    if (me.role !== "admin" && row.organizationId !== me.organizationId) throw notFound("Admission");
    if (row.dischargedAt) throw conflict("This animal has already been discharged.");
    return row;
  }

  /** Move to another ward. */
  router.patch("/:id", async (req, res) => {
    const me = currentUser(req);
    const body = z.object({ ward: v.text(60) }).strict().parse(req.body);
    const row = await loadOpen(me, v.uuid.parse(req.params.id));
    const [updated] = await db.update(admissions).set({ ward: body.ward }).where(eq(admissions.id, row.id)).returning();
    res.json(updated);
  });

  router.post("/:id/discharge", async (req, res) => {
    const me = currentUser(req);
    const body = z
      .object({
        notes: v.text(2000).optional(),
        animalStatus: z.enum(["healthy", "recovering", "under_treatment"]).optional(),
      })
      .parse(req.body);
    const row = await loadOpen(me, v.uuid.parse(req.params.id));
    const updated = await db.transaction(async (tx) => {
      const [a] = await tx
        .update(admissions)
        .set({ dischargedAt: new Date(), dischargedById: me.id, dischargeNotes: body.notes })
        .where(and(eq(admissions.id, row.id), isNull(admissions.dischargedAt)))
        .returning();
      if (!a) throw conflict("This animal has already been discharged.");
      if (body.animalStatus) await tx.update(animals).set({ status: body.animalStatus }).where(eq(animals.id, row.animalId));
      if (row.caseId) {
        await recordCaseEvent(tx, {
          caseId: row.caseId,
          type: "note",
          actorId: me.id,
          body: `Discharged from hospital.${body.notes ? ` ${body.notes}` : ""}`,
          data: { admissionId: row.id },
          visibleToReporter: true,
        });
      }
      return a;
    });
    res.json(updated);
  });

  return router;
}
