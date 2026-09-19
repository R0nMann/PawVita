import { Router } from "express";
import { and, asc, desc, eq, gte, inArray, lte, notInArray, sql } from "drizzle-orm";
import { z } from "zod";
import { currentUser, requireRole, type CurrentUser } from "../auth/middleware.js";
import type { Db } from "../db/client.js";
import { animals, herds, users, vaccinations, vaccines } from "../db/schema.js";
import type { Deps } from "../deps.js";
import { herdVisibility, herdWritable, loadVisibleCase } from "../lib/access.js";
import { badRequest, conflict, notFound } from "../lib/errors.js";
import * as v from "../lib/validation.js";
import { markFirstResponse, recordCaseEvent } from "../services/case-workflow.js";

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const today = () => new Date().toISOString().slice(0, 10);

const recordFields = z.object({
  vaccineCode: z.string().trim().min(1).max(40),
  administeredOn: v.isoDate,
  /** Overrides the date derived from the vaccine's booster interval. */
  nextDueOn: v.isoDate.nullable().optional(),
  doseNumber: z.number().int().min(1).max(20).optional(),
  batchNumber: v.text(60).optional(),
  caseId: v.uuid.optional(),
  notes: v.text(1000).optional(),
});

/**
 * Validate and insert vaccination records for animals the user may maintain.
 * A vet recording it is taken to have administered it; anyone else is
 * recording a vaccination given by someone else (a camp, a private vet).
 */
async function recordVaccinations(
  db: Db,
  me: CurrentUser,
  animalIds: string[],
  input: z.infer<typeof recordFields>,
  ids: (string | undefined)[] = [],
) {
  if (input.administeredOn > today()) throw badRequest("The vaccination date is in the future.");
  const [vaccine] = await db.select().from(vaccines).where(eq(vaccines.code, input.vaccineCode));
  if (!vaccine) throw badRequest("Unknown vaccine.", { field: "vaccineCode" });

  const found = await db
    .select({ id: animals.id, herdId: animals.herdId, species: animals.species, status: animals.status })
    .from(animals)
    .innerJoin(herds, eq(herds.id, animals.herdId))
    .where(and(inArray(animals.id, animalIds), herdWritable(me)));
  const foundIds = new Set(found.map((a) => a.id));
  const missing = animalIds.filter((id) => !foundIds.has(id));
  if (missing.length) throw notFound(`Animal${missing.length > 1 ? "s" : ""} ${missing.join(", ")}`);
  if (found.some((a) => a.status === "dead")) throw conflict("Cannot vaccinate an animal recorded as dead.");

  if (input.caseId) {
    const c = await loadVisibleCase(db, me, input.caseId);
    if (found.some((a) => a.herdId !== c.herdId)) throw badRequest("Every animal must belong to the case's herd.");
  }

  const nextDueOn =
    input.nextDueOn !== undefined
      ? input.nextDueOn
      : vaccine.boosterIntervalDays
        ? addDays(input.administeredOn, vaccine.boosterIntervalDays)
        : null;

  const rows = await db
    .insert(vaccinations)
    .values(
      animalIds.map((animalId, i) => ({
        id: ids[i],
        animalId,
        vaccineCode: vaccine.code,
        administeredOn: input.administeredOn,
        nextDueOn,
        doseNumber: input.doseNumber,
        batchNumber: input.batchNumber,
        administeredById: me.role === "vet" ? me.id : null,
        recordedById: me.id,
        caseId: input.caseId,
        notes: input.notes,
      })),
    )
    .returning();

  if (input.caseId) {
    await recordCaseEvent(db, {
      caseId: input.caseId,
      type: "vaccination_recorded",
      actorId: me.id,
      body: `${vaccine.name} given to ${rows.length} animal${rows.length > 1 ? "s" : ""}.`,
      data: { vaccineCode: vaccine.code, count: rows.length, nextDueOn },
      visibleToReporter: true,
    });
    await markFirstResponse(db, input.caseId, me);
  }
  return rows;
}

export function vaccinationsRouter(deps: Deps): Router {
  const { db } = deps;
  const router = Router();
  const canRecord = requireRole("farmer", "field_worker", "vet", "ward_staff", "admin");

  /** One record; `id` makes offline re-submission safe. */
  router.post("/vaccinations", canRecord, async (req, res) => {
    const me = currentUser(req);
    const body = recordFields.extend({ id: v.uuid.optional(), animalId: v.uuid }).parse(req.body);
    if (body.id) {
      const [existing] = await db.select().from(vaccinations).where(eq(vaccinations.id, body.id));
      if (existing) {
        if (existing.recordedById !== me.id) throw conflict("A vaccination with this id already exists.");
        res.status(200).json(existing);
        return;
      }
    }
    const [row] = await db.transaction((tx) => recordVaccinations(tx, me, [body.animalId], body, [body.id]));
    res.status(201).json(row);
  });

  /** Many animals, one vaccine — vaccination camps and herd-wide drives. */
  router.post("/vaccinations/batch", requireRole("vet", "field_worker", "admin"), async (req, res) => {
    const me = currentUser(req);
    const body = recordFields
      .extend({ animalIds: z.array(v.uuid).min(1).max(500) })
      .parse(req.body);
    const animalIds = [...new Set(body.animalIds)];
    const rows = await db.transaction((tx) => recordVaccinations(tx, me, animalIds, body));
    res.status(201).json({ items: rows, count: rows.length });
  });

  router.get("/vaccinations", async (req, res) => {
    const me = currentUser(req);
    const q = v.pagination.extend({ animalId: v.uuid.optional(), herdId: v.uuid.optional() }).parse(req.query);
    const rows = await db
      .select({ vaccination: vaccinations, vaccineName: vaccines.name, animalName: animals.name })
      .from(vaccinations)
      .innerJoin(vaccines, eq(vaccines.code, vaccinations.vaccineCode))
      .innerJoin(animals, eq(animals.id, vaccinations.animalId))
      .innerJoin(herds, eq(herds.id, animals.herdId))
      .where(
        and(
          herdVisibility(me),
          q.animalId ? eq(vaccinations.animalId, q.animalId) : undefined,
          q.herdId ? eq(animals.herdId, q.herdId) : undefined,
        ),
      )
      .orderBy(desc(vaccinations.administeredOn), desc(vaccinations.createdAt))
      .limit(q.limit + 1)
      .offset(q.offset);
    res.json(v.page(rows.map((r) => ({ ...r.vaccination, vaccineName: r.vaccineName, animalName: r.animalName })), q));
  });

  /**
   * Vaccination schedule: for each animal and vaccine, the latest record whose
   * next dose falls within the window. Farmers see their herd; vets and
   * officials see the gaps across their area.
   */
  router.get("/vaccinations/due", async (req, res) => {
    const me = currentUser(req);
    const q = v.pagination
      .extend({
        withinDays: z.coerce.number().int().min(0).max(365).default(30),
        includeOverdue: v.queryBool.default(true),
        herdId: v.uuid.optional(),
        vaccineCode: z.string().max(40).optional(),
      })
      .parse(req.query);

    const latest = db
      .selectDistinctOn([vaccinations.animalId, vaccinations.vaccineCode], {
        animalId: vaccinations.animalId,
        vaccineCode: vaccinations.vaccineCode,
        administeredOn: vaccinations.administeredOn,
        nextDueOn: vaccinations.nextDueOn,
      })
      .from(vaccinations)
      .innerJoin(animals, eq(animals.id, vaccinations.animalId))
      .innerJoin(herds, eq(herds.id, animals.herdId))
      .where(
        and(
          herdVisibility(me),
          notInArray(animals.status, ["dead", "sold"]),
          q.herdId ? eq(animals.herdId, q.herdId) : undefined,
          q.vaccineCode ? eq(vaccinations.vaccineCode, q.vaccineCode) : undefined,
        ),
      )
      .orderBy(
        vaccinations.animalId,
        vaccinations.vaccineCode,
        desc(vaccinations.administeredOn),
        desc(vaccinations.createdAt),
      )
      .as("latest");

    const horizon = addDays(today(), q.withinDays);
    const rows = await db
      .select({
        animalId: latest.animalId,
        vaccineCode: latest.vaccineCode,
        lastAdministeredOn: latest.administeredOn,
        nextDueOn: latest.nextDueOn,
        vaccineName: vaccines.name,
        animalName: animals.name,
        tagNumber: animals.tagNumber,
        species: animals.species,
        herdId: herds.id,
        herdName: herds.name,
        ownerName: users.fullName,
        ownerPhone: users.phone,
      })
      .from(latest)
      .innerJoin(vaccines, eq(vaccines.code, latest.vaccineCode))
      .innerJoin(animals, eq(animals.id, latest.animalId))
      .innerJoin(herds, eq(herds.id, animals.herdId))
      .innerJoin(users, eq(users.id, herds.ownerId))
      .where(
        and(
          sql`${latest.nextDueOn} is not null`,
          lte(latest.nextDueOn, horizon),
          q.includeOverdue ? undefined : gte(latest.nextDueOn, today()),
        ),
      )
      .orderBy(asc(latest.nextDueOn), asc(animals.name))
      .limit(q.limit + 1)
      .offset(q.offset);

    const t = today();
    res.json(v.page(rows.map((r) => ({ ...r, status: r.nextDueOn! < t ? "overdue" : "upcoming" })), q));
  });

  return router;
}
