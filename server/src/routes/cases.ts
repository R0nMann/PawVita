import { Router } from "express";
import { and, asc, desc, eq, gte, ilike, inArray, isNull, lte, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";
import { currentUser, requireRole, type CurrentUser } from "../auth/middleware.js";
import type { Db } from "../db/client.js";
import {
  admissions,
  aiAssessments,
  AI_REVIEW_DECISIONS,
  animals,
  CASE_OUTCOMES,
  CASE_STATUSES,
  cases,
  caseSymptoms,
  diseases,
  herds,
  LAB_PRIORITIES,
  labRequests,
  mortalityRecords,
  organizations,
  RISK_LEVELS,
  symptoms,
  treatments,
  users,
} from "../db/schema.js";
import type { Deps } from "../deps.js";
import { caseVisibility, CLINICAL_ROLES, isReporterSide, loadVisibleCase, loadWritableHerd } from "../lib/access.js";
import { badRequest, conflict, HttpError, notFound } from "../lib/errors.js";
import { describeRegions, requireRegion, withinRegion } from "../lib/regions.js";
import * as v from "../lib/validation.js";
import { scheduleAiAssessment } from "../services/ai-runner.js";
import { caseDetail, caseTimeline } from "../services/case-queries.js";
import {
  markFirstResponse,
  recordCaseEvent,
  transitionCase,
  type CaseRow,
} from "../services/case-workflow.js";
import { notify, reporterSideIds, vetsCovering } from "../services/notifications.js";

const RISK_LABEL = { low: "Low — monitor", moderate: "Moderate — veterinary review", high: "High — urgent attention" };

/** Allowed clock skew for device timestamps, and how far back an offline report may be. */
const FUTURE_SKEW_MS = 5 * 60 * 1000;
const MAX_OFFLINE_AGE_MS = 90 * 24 * 60 * 60 * 1000;

const createCaseBody = z
  .object({
    /** Client-generated so a report queued offline is stored once, however often it is replayed. */
    id: v.uuid.optional(),
    herdId: v.uuid,
    animalId: v.uuid.optional(),
    symptomCodes: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
    /** Free text or a voice transcript. The recording itself is uploaded as an attachment. */
    description: v.text(4000).optional(),
    animalsAffected: z.number().int().min(1).max(100_000).default(1),
    animalsDead: z.number().int().min(0).max(100_000).default(0),
    onsetDate: v.isoDate.optional(),
    priorTreatmentNotes: v.text(1000).optional(),
    priorVaccinationNotes: v.text(1000).optional(),
    location: z
      .object({ lat: v.latitude, lng: v.longitude, accuracyM: z.number().min(0).max(100_000).optional() })
      .optional(),
    reportedAt: v.isoDateTime.optional(),
    capturedOffline: z.boolean().default(false),
  })
  .refine((b) => b.symptomCodes.length > 0 || b.description, {
    message: "Select at least one symptom or describe what you see.",
    path: ["symptomCodes"],
  });

/**
 * Put a case under review the first time a vet acts on it — they have, by
 * definition, started reviewing it.
 */
async function beginReview(db: Db, c: CaseRow, me: CurrentUser): Promise<CaseRow> {
  await markFirstResponse(db, c.id, me);
  return c.status === "active" && me.role === "vet"
    ? transitionCase(db, c, "under_review", me, { automatic: true })
    : c;
}

/** Catalogue name of a disease code; null/undefined pass through, unknown codes are rejected. */
async function diseaseNameOf(db: Db, code: string | null | undefined) {
  if (code === undefined || code === null) return code;
  const [d] = await db.select({ name: diseases.name }).from(diseases).where(eq(diseases.code, code));
  if (!d) throw badRequest("Unknown disease code.", { diseaseCode: code });
  return d.name;
}

export function casesRouter(deps: Deps): Router {
  const { db } = deps;
  const router = Router();
  const clinical = requireRole(...CLINICAL_ROLES);

  // --- Report a case (architecture §4) ---------------------------------------

  router.post("/", requireRole("farmer", "field_worker", "vet", "ward_staff", "admin"), async (req, res) => {
    const me = currentUser(req);
    const body = createCaseBody.parse(req.body);

    if (body.id) {
      const [existing] = await db.select().from(cases).where(eq(cases.id, body.id));
      if (existing) {
        if (existing.reportedById !== me.id) throw conflict("A case with this id already exists.");
        res.status(200).json(await caseDetail(deps, me, existing.id));
        return;
      }
    }

    const reportedAt = body.reportedAt ? new Date(body.reportedAt) : new Date();
    const now = Date.now();
    if (reportedAt.getTime() > now + FUTURE_SKEW_MS) throw badRequest("reportedAt is in the future.");
    if (reportedAt.getTime() < now - MAX_OFFLINE_AGE_MS) throw badRequest("reportedAt is more than 90 days old.");

    const herd = await loadWritableHerd(db, me, body.herdId);

    const created = await db.transaction(async (tx) => {
      let species: string | null = null;
      if (body.animalId) {
        const [animal] = await tx
          .select()
          .from(animals)
          .where(and(eq(animals.id, body.animalId), eq(animals.herdId, herd.id)));
        if (!animal) throw badRequest("That animal is not in this herd.", { field: "animalId" });
        if (animal.status === "dead") throw conflict("This animal is recorded as dead. Report the death instead.");
        species = animal.species;
        if (animal.status === "healthy" || animal.status === "recovering") {
          await tx.update(animals).set({ status: "sick" }).where(eq(animals.id, animal.id));
        }
      }

      const codes = [...new Set(body.symptomCodes)];
      if (codes.length) {
        const known = await tx.select({ code: symptoms.code }).from(symptoms).where(inArray(symptoms.code, codes));
        const unknown = codes.filter((c) => !known.some((k) => k.code === c));
        if (unknown.length) throw badRequest("Unknown symptom codes.", { symptomCodes: unknown });
      }

      const [c] = await tx
        .insert(cases)
        .values({
          id: body.id,
          caseNumber: sql`'PV-' || to_char(now() at time zone 'Asia/Kolkata', 'YYYY') || '-' ||
            lpad(nextval('pawvita.case_number_seq')::text, 6, '0')`,
          herdId: herd.id,
          animalId: body.animalId,
          reportedById: me.id,
          description: body.description,
          animalsAffected: body.animalsAffected,
          animalsDead: body.animalsDead,
          onsetDate: body.onsetDate,
          priorTreatmentNotes: body.priorTreatmentNotes,
          priorVaccinationNotes: body.priorVaccinationNotes,
          lat: body.location?.lat ?? herd.lat,
          lng: body.location?.lng ?? herd.lng,
          locationAccuracyM: body.location?.accuracyM,
          regionId: herd.regionId,
          stateId: herd.stateId,
          districtId: herd.districtId,
          blockId: herd.blockId,
          villageId: herd.villageId,
          // A report raised inside a hospital belongs to that hospital from the start.
          assignedOrgId: me.role === "ward_staff" ? me.organizationId : null,
          capturedOffline: body.capturedOffline,
          reportedAt,
        })
        .returning();

      if (codes.length) await tx.insert(caseSymptoms).values(codes.map((symptomCode) => ({ caseId: c!.id, symptomCode })));
      if (body.animalId) {
        // An animal already in a hospital ward: its stay is now about this case.
        await tx
          .update(admissions)
          .set({ caseId: c!.id })
          .where(and(eq(admissions.animalId, body.animalId), isNull(admissions.dischargedAt), isNull(admissions.caseId)));
      }
      if (body.animalsDead > 0) {
        await tx.insert(mortalityRecords).values({
          herdId: herd.id,
          count: body.animalsDead,
          diedOn: reportedAt.toISOString().slice(0, 10),
          caseId: c!.id,
          reportedById: me.id,
          notes: "Reported with the case.",
        });
      }
      await recordCaseEvent(tx, {
        caseId: c!.id,
        type: "created",
        actorId: me.id,
        data: { symptomCodes: codes, capturedOffline: body.capturedOffline },
        visibleToReporter: true,
      });
      await notify(
        tx,
        await vetsCovering(tx, herd),
        {
          type: "case_reported",
          title: `New case ${c!.caseNumber}`,
          body: `${species ?? "Livestock"} in ${herd.name}: ${body.animalsAffected} affected${
            body.animalsDead ? `, ${body.animalsDead} dead` : ""
          }.`,
          data: { caseId: c!.id },
        },
        { exclude: me.id },
      );
      return c!;
    });

    scheduleAiAssessment(deps, created.id, "case_created");
    res.status(201).json(await caseDetail(deps, me, created.id));
  });

  // --- Case queues -----------------------------------------------------------

  router.get("/", async (req, res) => {
    const me = currentUser(req);
    const q = v.pagination
      .extend({
        status: v.queryList(z.enum(CASE_STATUSES)),
        open: v.queryBool.optional(),
        riskLevel: v.queryList(z.enum([...RISK_LEVELS, "unassessed"])),
        assignedToMe: v.queryBool.optional(),
        assignedVetId: v.uuid.optional(),
        unassigned: v.queryBool.optional(),
        reportedByMe: v.queryBool.optional(),
        regionId: v.uuid.optional(),
        herdId: v.uuid.optional(),
        animalId: v.uuid.optional(),
        diseaseCode: z.string().max(40).optional(),
        from: v.isoDateTime.optional(),
        to: v.isoDateTime.optional(),
        updatedSince: v.isoDateTime.optional(),
        q: z.string().trim().min(1).max(40).optional(),
        sort: z.enum(["priority", "recent", "updated"]).default("recent"),
      })
      .parse(req.query);

    const filters: (SQL | undefined)[] = [caseVisibility(me)];
    if (q.status) filters.push(inArray(cases.status, q.status));
    if (q.open === true) filters.push(sql`${cases.status} <> 'resolved'`);
    if (q.open === false) filters.push(eq(cases.status, "resolved"));
    if (q.riskLevel) {
      const levels = q.riskLevel.filter((r): r is (typeof RISK_LEVELS)[number] => r !== "unassessed");
      filters.push(
        or(
          levels.length ? inArray(cases.riskLevel, levels) : undefined,
          q.riskLevel.includes("unassessed") ? isNull(cases.riskLevel) : undefined,
        ),
      );
    }
    if (q.assignedToMe) filters.push(eq(cases.assignedVetId, me.id));
    if (q.assignedVetId) filters.push(eq(cases.assignedVetId, q.assignedVetId));
    if (q.unassigned) filters.push(isNull(cases.assignedVetId));
    if (q.reportedByMe) filters.push(eq(cases.reportedById, me.id));
    if (q.regionId) filters.push(withinRegion(cases, await requireRegion(db, q.regionId)));
    if (q.herdId) filters.push(eq(cases.herdId, q.herdId));
    if (q.animalId) filters.push(eq(cases.animalId, q.animalId));
    if (q.diseaseCode) {
      filters.push(or(eq(cases.suspectedDiseaseCode, q.diseaseCode), eq(cases.confirmedDiseaseCode, q.diseaseCode)));
    }
    if (q.from) filters.push(gte(cases.createdAt, new Date(q.from)));
    if (q.to) filters.push(lte(cases.createdAt, new Date(q.to)));
    if (q.updatedSince) filters.push(gte(cases.updatedAt, new Date(q.updatedSince)));
    if (q.q) filters.push(ilike(cases.caseNumber, v.likePattern(q.q)));

    const order =
      q.sort === "priority"
        ? [
            // High first, then unassessed (nobody has looked yet), moderate, low; oldest waiting first.
            sql`case ${cases.riskLevel} when 'high' then 0 when 'moderate' then 2 when 'low' then 3 else 1 end`,
            asc(cases.createdAt),
          ]
        : q.sort === "updated"
          ? [desc(cases.updatedAt)]
          : [desc(cases.createdAt)];

    const owner = alias(users, "owner");
    const vet = alias(users, "vet");
    const rows = await db
      .select({
        c: cases,
        herdName: herds.name,
        ownerId: owner.id,
        ownerName: owner.fullName,
        vetName: vet.fullName,
        animalName: animals.name,
        animalTag: animals.tagNumber,
        species: animals.species,
        symptomCodes: sql<string[]>`array(select ${caseSymptoms.symptomCode} from ${caseSymptoms}
          where ${caseSymptoms.caseId} = ${cases.id} order by 1)`,
      })
      .from(cases)
      .innerJoin(herds, eq(herds.id, cases.herdId))
      .innerJoin(owner, eq(owner.id, herds.ownerId))
      .leftJoin(vet, eq(vet.id, cases.assignedVetId))
      .leftJoin(animals, eq(animals.id, cases.animalId))
      .where(and(...filters))
      .orderBy(...order, asc(cases.id))
      .limit(q.limit + 1)
      .offset(q.offset);

    const regionInfo = await describeRegions(db, rows.map((r) => r.c.regionId));
    res.json(
      v.page(
        rows.map((r) => ({
          id: r.c.id,
          caseNumber: r.c.caseNumber,
          status: r.c.status,
          riskLevel: r.c.riskLevel,
          suspectedDiseaseCode: r.c.suspectedDiseaseCode,
          confirmedDiseaseCode: r.c.confirmedDiseaseCode,
          animalsAffected: r.c.animalsAffected,
          animalsDead: r.c.animalsDead,
          symptomCodes: r.symptomCodes,
          herd: { id: r.c.herdId, name: r.herdName },
          owner: { id: r.ownerId, fullName: r.ownerName },
          animal: r.c.animalId ? { id: r.c.animalId, name: r.animalName, tagNumber: r.animalTag, species: r.species } : null,
          assignedVet: r.c.assignedVetId ? { id: r.c.assignedVetId, fullName: r.vetName } : null,
          location: { lat: r.c.lat, lng: r.c.lng },
          region: regionInfo.get(r.c.regionId) ?? null,
          capturedOffline: r.c.capturedOffline,
          reportedAt: r.c.reportedAt,
          createdAt: r.c.createdAt,
          updatedAt: r.c.updatedAt,
        })),
        q,
      ),
    );
  });

  router.get("/:id", async (req, res) => {
    res.json(await caseDetail(deps, currentUser(req), v.uuid.parse(req.params.id)));
  });

  router.get("/:id/timeline", async (req, res) => {
    const me = currentUser(req);
    const c = await loadVisibleCase(db, me, v.uuid.parse(req.params.id));
    res.json({ items: await caseTimeline(db, me, c.id) });
  });

  // --- Veterinary actions (architecture §9) ------------------------------------

  router.patch("/:id/status", clinical, async (req, res) => {
    const me = currentUser(req);
    const body = z
      .object({
        status: z.enum(CASE_STATUSES),
        note: v.text(2000).optional(),
        outcome: z.enum(CASE_OUTCOMES).optional(),
      })
      .parse(req.body);
    const c = await loadVisibleCase(db, me, v.uuid.parse(req.params.id));
    await db.transaction(async (tx) => {
      const updated = await transitionCase(tx, c, body.status, me, { note: body.note, outcome: body.outcome });
      if (body.status === "resolved" && updated.animalId && body.outcome === "recovered") {
        await tx
          .update(animals)
          .set({ status: "healthy" })
          .where(and(eq(animals.id, updated.animalId), inArray(animals.status, ["sick", "under_treatment", "recovering"])));
      }
    });
    res.json(await caseDetail(deps, me, c.id));
  });

  /** Risk level and working / confirmed diagnosis — the vet's assessment of the case. */
  router.patch("/:id/assessment", clinical, async (req, res) => {
    const me = currentUser(req);
    const body = z
      .object({
        riskLevel: z.enum(RISK_LEVELS).nullable().optional(),
        suspectedDiseaseCode: z.string().max(40).nullable().optional(),
        confirmedDiseaseCode: z.string().max(40).nullable().optional(),
        note: v.text(2000).optional(),
      })
      .strict()
      .parse(req.body);
    const { note, ...requested } = body;
    if (!Object.keys(requested).length && !note) throw badRequest("Nothing to update.");
    const c = await loadVisibleCase(db, me, v.uuid.parse(req.params.id));
    // Only fields whose value actually changes are saved and described.
    const changes = Object.fromEntries(
      Object.entries(requested).filter(([k, value]) => value !== c[k as keyof typeof requested]),
    ) as typeof requested;
    if (!Object.keys(changes).length && !note) {
      res.json(await caseDetail(deps, me, c.id));
      return;
    }
    const suspectedName = await diseaseNameOf(db, changes.suspectedDiseaseCode);
    const confirmedName = await diseaseNameOf(db, changes.confirmedDiseaseCode);

    await db.transaction(async (tx) => {
      const current = await beginReview(tx, c, me);
      if (Object.keys(changes).length) await tx.update(cases).set(changes).where(eq(cases.id, current.id));
      const parts = [
        changes.riskLevel !== undefined && (changes.riskLevel ? `Risk level: ${RISK_LABEL[changes.riskLevel]}.` : "Risk level cleared."),
        changes.suspectedDiseaseCode !== undefined && (suspectedName ? `Suspected disease: ${suspectedName}.` : "Suspected disease cleared."),
        changes.confirmedDiseaseCode !== undefined && (confirmedName ? `Confirmed diagnosis: ${confirmedName}.` : "Confirmed diagnosis removed."),
        note,
      ].filter(Boolean);
      await recordCaseEvent(tx, {
        caseId: c.id,
        type: "assessment_updated",
        actorId: me.id,
        body: parts.join(" "),
        data: { ...changes, previous: { riskLevel: c.riskLevel, suspectedDiseaseCode: c.suspectedDiseaseCode, confirmedDiseaseCode: c.confirmedDiseaseCode } },
        visibleToReporter: true,
      });
      if (changes.riskLevel === "high" || changes.confirmedDiseaseCode) {
        await notify(
          tx,
          await reporterSideIds(tx, c),
          {
            type: "advice",
            title: `Case ${c.caseNumber}: veterinary assessment`,
            body: parts.join(" "),
            data: { caseId: c.id },
          },
          { exclude: me.id },
        );
      }
    });
    res.json(await caseDetail(deps, me, c.id));
  });

  /** Assign a vet and/or refer the case to a hospital. District officials coordinate this too. */
  router.post("/:id/assign", requireRole("vet", "official", "admin"), async (req, res) => {
    const me = currentUser(req);
    const body = z
      .object({ vetId: v.uuid.nullable().optional(), organizationId: v.uuid.nullable().optional(), note: v.text(1000).optional() })
      .refine((b) => b.vetId !== undefined || b.organizationId !== undefined, "Give vetId and/or organizationId.")
      .parse(req.body);
    const c = await loadVisibleCase(db, me, v.uuid.parse(req.params.id));

    let vetName: string | null = null;
    if (body.vetId) {
      const [vet] = await db
        .select({ id: users.id, fullName: users.fullName })
        .from(users)
        .where(and(eq(users.id, body.vetId), eq(users.role, "vet"), eq(users.status, "active")));
      if (!vet) throw badRequest("Assign an active veterinarian.", { field: "vetId" });
      vetName = vet.fullName;
    }
    let orgName: string | null = null;
    if (body.organizationId) {
      const [org] = await db
        .select({ name: organizations.name })
        .from(organizations)
        .where(and(eq(organizations.id, body.organizationId), inArray(organizations.type, ["hospital", "department"])));
      if (!org) throw badRequest("Refer to a hospital or veterinary department.", { field: "organizationId" });
      orgName = org.name;
    }

    await db.transaction(async (tx) => {
      await tx
        .update(cases)
        .set({
          ...(body.vetId !== undefined && { assignedVetId: body.vetId }),
          ...(body.organizationId !== undefined && { assignedOrgId: body.organizationId }),
        })
        .where(eq(cases.id, c.id));
      const summary = [vetName && `${vetName} is handling this case.`, orgName && `Referred to ${orgName}.`, body.note]
        .filter(Boolean)
        .join(" ");
      await recordCaseEvent(tx, {
        caseId: c.id,
        type: "assigned",
        actorId: me.id,
        body: summary || "Assignment cleared.",
        data: { vetId: body.vetId, organizationId: body.organizationId },
        visibleToReporter: true,
      });
      if (body.vetId) {
        await notify(
          tx,
          [body.vetId],
          {
            type: "case_assigned",
            title: `Case ${c.caseNumber} assigned to you`,
            body: body.note ?? `Assigned by ${me.fullName}.`,
            data: { caseId: c.id },
          },
          { exclude: me.id },
        );
        if (c.status === "active") {
          await transitionCase(tx, c, "under_review", me.role === "vet" ? me : null, { automatic: true });
        }
      }
      if (summary) {
        await notify(tx, await reporterSideIds(tx, c), {
          type: "case_assigned",
          title: `Case ${c.caseNumber}: vet assigned`,
          body: summary,
          data: { caseId: c.id },
        });
      }
      await markFirstResponse(tx, c.id, me);
    });
    res.json(await caseDetail(deps, me, c.id));
  });

  /**
   * Notes and advice. Staff notes are internal unless `visibleToReporter`
   * (then they are "advice" and the farmer is notified). Farmers' own
   * follow-ups are always visible and go to the assigned vet.
   */
  router.post("/:id/notes", async (req, res) => {
    const me = currentUser(req);
    if (me.role === "official") throw new HttpError(403, "forbidden", "Officials cannot add case notes.");
    const body = z.object({ body: v.text(4000), visibleToReporter: z.boolean().default(false) }).parse(req.body);
    const c = await loadVisibleCase(db, me, v.uuid.parse(req.params.id));
    const reporterSide = isReporterSide(me);
    const visible = reporterSide || body.visibleToReporter;
    const type = !reporterSide && visible ? "advice" : "note";

    const event = await db.transaction(async (tx) => {
      const current = me.role === "vet" ? await beginReview(tx, c, me) : c;
      const e = await recordCaseEvent(tx, {
        caseId: current.id,
        type,
        actorId: me.id,
        body: body.body,
        visibleToReporter: visible,
      });
      if (type === "advice") {
        await notify(
          tx,
          await reporterSideIds(tx, c),
          { type: "advice", title: `Advice on case ${c.caseNumber}`, body: body.body, data: { caseId: c.id } },
          { exclude: me.id },
        );
      } else if (reporterSide) {
        await notify(
          tx,
          [c.assignedVetId],
          { type: "case_status", title: `Update on case ${c.caseNumber}`, body: body.body, data: { caseId: c.id } },
          { exclude: me.id },
        );
      }
      return e;
    });
    res.status(201).json(event);
  });

  router.post("/:id/treatments", clinical, async (req, res) => {
    const me = currentUser(req);
    const body = z
      .object({
        animalId: v.uuid.optional(),
        medicine: v.text(200),
        dosage: v.text(200).optional(),
        route: v.text(60).optional(),
        frequency: v.text(100).optional(),
        durationDays: z.number().int().min(1).max(365).optional(),
        startDate: v.isoDate.optional(),
        withdrawalPeriodDays: z.number().int().min(0).max(365).optional(),
        instructions: v.text(2000).optional(),
        notes: v.text(2000).optional(),
      })
      .parse(req.body);
    const c = await loadVisibleCase(db, me, v.uuid.parse(req.params.id));
    if (c.status === "resolved") throw conflict("Reopen the case before adding treatment or lab work.");
    const animalId = body.animalId ?? c.animalId;
    if (body.animalId) {
      const [a] = await db.select({ herdId: animals.herdId }).from(animals).where(eq(animals.id, body.animalId));
      if (!a || a.herdId !== c.herdId) throw badRequest("That animal is not in this case's herd.", { field: "animalId" });
    }

    const treatment = await db.transaction(async (tx) => {
      const current = await beginReview(tx, c, me);
      const [t] = await tx
        .insert(treatments)
        .values({ ...body, caseId: c.id, animalId, prescribedById: me.id })
        .returning();
      if (animalId) {
        await tx
          .update(animals)
          .set({ status: "under_treatment" })
          .where(and(eq(animals.id, animalId), inArray(animals.status, ["healthy", "sick", "recovering"])));
      }
      const text = [
        `Treatment: ${body.medicine}${body.dosage ? `, ${body.dosage}` : ""}${body.frequency ? `, ${body.frequency}` : ""}${
          body.durationDays ? ` for ${body.durationDays} days` : ""
        }.`,
        body.instructions,
        body.withdrawalPeriodDays
          ? `Do not sell milk or meat from this animal for ${body.withdrawalPeriodDays} days after treatment ends.`
          : null,
      ]
        .filter(Boolean)
        .join(" ");
      await recordCaseEvent(tx, {
        caseId: c.id,
        type: "treatment_added",
        actorId: me.id,
        body: text,
        data: { treatmentId: t!.id },
        visibleToReporter: true,
      });
      await notify(
        tx,
        await reporterSideIds(tx, c),
        { type: "treatment", title: `Treatment for case ${c.caseNumber}`, body: text, data: { caseId: c.id, treatmentId: t!.id } },
        { exclude: me.id },
      );
      // Treating moves the case on, unless it is still waiting for the laboratory.
      if (current.status === "active" || current.status === "under_review") {
        await transitionCase(tx, current, "treated", me, { automatic: true });
      }
      return t!;
    });
    res.status(201).json(treatment);
  });

  router.post("/:id/lab-requests", clinical, async (req, res) => {
    const me = currentUser(req);
    const body = z
      .object({
        animalId: v.uuid.optional(),
        labOrgId: v.uuid,
        sampleType: v.text(120),
        tests: z.array(v.text(120)).min(1).max(20),
        priority: z.enum(LAB_PRIORITIES).default("normal"),
        notes: v.text(2000).optional(),
        collectedAt: v.isoDateTime.optional(),
      })
      .parse(req.body);
    const c = await loadVisibleCase(db, me, v.uuid.parse(req.params.id));
    if (c.status === "resolved") throw conflict("Reopen the case before adding treatment or lab work.");
    const [lab] = await db
      .select({ id: organizations.id, name: organizations.name })
      .from(organizations)
      .where(and(eq(organizations.id, body.labOrgId), inArray(organizations.type, ["lab", "hospital"])));
    if (!lab) throw badRequest("Choose a laboratory.", { field: "labOrgId" });
    const animalId = body.animalId ?? c.animalId;
    if (body.animalId) {
      const [a] = await db.select({ herdId: animals.herdId }).from(animals).where(eq(animals.id, body.animalId));
      if (!a || a.herdId !== c.herdId) throw badRequest("That animal is not in this case's herd.", { field: "animalId" });
    }

    const request = await db.transaction(async (tx) => {
      const current = await beginReview(tx, c, me);
      const [r] = await tx
        .insert(labRequests)
        .values({
          requestNumber: sql`'LAB-' || to_char(now() at time zone 'Asia/Kolkata', 'YYYY') || '-' ||
            lpad(nextval('pawvita.lab_request_number_seq')::text, 6, '0')`,
          caseId: c.id,
          animalId,
          requestedById: me.id,
          labOrgId: lab.id,
          sampleType: body.sampleType,
          tests: body.tests,
          priority: body.priority,
          notes: body.notes,
          status: body.collectedAt ? "collected" : "requested",
          collectedAt: body.collectedAt ? new Date(body.collectedAt) : null,
        })
        .returning();
      await recordCaseEvent(tx, {
        caseId: c.id,
        type: "lab_requested",
        actorId: me.id,
        body: `${body.sampleType} sample sent to ${lab.name} for ${body.tests.join(", ")}.`,
        data: { labRequestId: r!.id, requestNumber: r!.requestNumber, priority: body.priority },
        visibleToReporter: true,
      });
      const techs = await tx
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.organizationId, lab.id), eq(users.role, "lab_tech"), eq(users.status, "active")));
      await notify(tx, techs.map((t) => t.id), {
        type: "lab_request",
        title: `New ${body.priority} sample ${r!.requestNumber}`,
        body: `${body.sampleType} for ${body.tests.join(", ")} (case ${c.caseNumber}).`,
        data: { labRequestId: r!.id, caseId: c.id },
      });
      if (current.status !== "lab_pending") {
        await transitionCase(tx, current, "lab_pending", me, { automatic: true });
      }
      return r!;
    });
    res.status(201).json(request);
  });

  /** Accept, reject or amend an AI result — final decisions stay with the vet (§7). */
  router.post("/:id/ai-assessments/:assessmentId/review", clinical, async (req, res) => {
    const me = currentUser(req);
    const body = z.object({ decision: z.enum(AI_REVIEW_DECISIONS), notes: v.text(2000).optional() }).parse(req.body);
    const c = await loadVisibleCase(db, me, v.uuid.parse(req.params.id));
    const assessmentId = v.uuid.parse(req.params.assessmentId);
    const [a] = await db
      .select()
      .from(aiAssessments)
      .where(and(eq(aiAssessments.id, assessmentId), eq(aiAssessments.caseId, c.id)));
    if (!a) throw notFound("AI assessment");
    if (a.status !== "completed") throw conflict("Only completed assessments can be reviewed.");

    const updated = await db.transaction(async (tx) => {
      await beginReview(tx, c, me);
      const [row] = await tx
        .update(aiAssessments)
        .set({ reviewDecision: body.decision, reviewNotes: body.notes, reviewedById: me.id, reviewedAt: new Date() })
        .where(eq(aiAssessments.id, a.id))
        .returning();
      await recordCaseEvent(tx, {
        caseId: c.id,
        type: "ai_reviewed",
        actorId: me.id,
        body: body.notes ?? null,
        data: { assessmentId: a.id, module: a.module, decision: body.decision },
      });
      return row!;
    });
    res.json(updated);
  });

  return router;
}
