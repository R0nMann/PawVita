import { Router } from "express";
import { and, asc, desc, eq, gte, ilike, inArray, isNull, notInArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import { currentUser, requireRole, type CurrentUser } from "../auth/middleware.js";
import type { Db } from "../db/client.js";
import {
  admissions,
  animals,
  ANIMAL_SEXES,
  ANIMAL_STATUSES,
  cases,
  herds,
  labRequests,
  mortalityRecords,
  organizations,
  SPECIES,
  treatments,
  users,
  vaccinations,
  vaccines,
} from "../db/schema.js";
import type { Deps } from "../deps.js";
import {
  herdVisibility,
  loadVisibleAnimal,
  loadVisibleHerd,
  loadWritableHerd,
} from "../lib/access.js";
import { badRequest, conflict, forbidden, notFound } from "../lib/errors.js";
import {
  ancestryOf,
  describeRegion,
  describeRegions,
  regionContains,
  requireRegion,
  withinRegion,
  type RegionRef,
} from "../lib/regions.js";
import * as v from "../lib/validation.js";
import { notify, vetsCovering } from "../services/notifications.js";
import { vaccinationStatus } from "../services/animals.js";
import { presentPerson } from "../services/users.js";

const HERD_REGION_LEVELS = ["district", "block", "village"];

/** Check a herd location and that the user may register herds there. */
async function herdRegionFor(db: Db, user: CurrentUser, regionId: string | undefined): Promise<RegionRef> {
  const id = regionId ?? user.regionId;
  if (!id) throw badRequest("Choose the village where the herd is kept.", { field: "regionId" });
  const region = await requireRegion(db, id);
  if (!HERD_REGION_LEVELS.includes(region.level)) {
    throw badRequest("A herd must be located in a village, block or district.", { field: "regionId" });
  }
  // Field staff work inside their own area; hospitals take walk-ins from anywhere.
  if ((user.role === "field_worker" || user.role === "vet") && !(user.region && regionContains(user.region, region))) {
    throw forbidden("That location is outside your area.");
  }
  return region;
}

const ownerInput = z.object({
  fullName: v.text(120),
  phone: v.phone.optional(),
  preferredLanguage: v.language.default("en"),
});

/**
 * Resolve the farmer who owns a new herd. Farmers own their own herds; staff
 * name an existing farmer or register one inline (a farmer without a login
 * yet, linked later when they first verify their phone).
 */
async function resolveOwner(
  db: Db,
  user: CurrentUser,
  body: { ownerId?: string; owner?: z.infer<typeof ownerInput> },
  region: RegionRef,
): Promise<string> {
  if (user.role === "farmer") {
    if (body.ownerId && body.ownerId !== user.id) throw forbidden("Farmers can only register their own herds.");
    return user.id;
  }
  if (body.ownerId) {
    const [owner] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, body.ownerId));
    if (!owner || owner.role !== "farmer") throw badRequest("The owner must be a registered farmer.", { field: "ownerId" });
    return owner.id;
  }
  if (!body.owner) throw badRequest("Give the herd owner (ownerId or owner).", { field: "owner" });
  if (body.owner.phone) {
    const [existing] = await db.select().from(users).where(eq(users.phone, body.owner.phone));
    if (existing) {
      if (existing.role !== "farmer") throw conflict("That phone number belongs to a staff account.");
      return existing.id;
    }
  }
  const [created] = await db
    .insert(users)
    .values({
      role: "farmer",
      status: "active",
      fullName: body.owner.fullName,
      phone: body.owner.phone,
      preferredLanguage: body.owner.preferredLanguage,
      regionId: region.id,
      createdById: user.id,
    })
    .returning({ id: users.id });
  return created!.id;
}

export function herdsRouter(deps: Deps): Router {
  const { db } = deps;
  const router = Router();
  const canRegister = requireRole("farmer", "field_worker", "vet", "ward_staff", "admin");

  // --- Herds ----------------------------------------------------------------

  router.get("/herds", async (req, res) => {
    const me = currentUser(req);
    const q = v.pagination
      .extend({
        ownerId: v.uuid.optional(),
        regionId: v.uuid.optional(),
        q: z.string().trim().min(1).max(80).optional(),
      })
      .parse(req.query);
    const region = q.regionId ? await requireRegion(db, q.regionId) : null;
    const rows = await db
      .select({
        herd: herds,
        owner: { id: users.id, fullName: users.fullName, phone: users.phone, role: users.role },
        animalCount: sql<number>`(select count(*)::int from ${animals} where ${animals.herdId} = ${herds.id}
          and ${animals.status} not in ('dead', 'sold'))`,
      })
      .from(herds)
      .innerJoin(users, eq(users.id, herds.ownerId))
      .where(
        and(
          herdVisibility(me),
          q.ownerId ? eq(herds.ownerId, q.ownerId) : undefined,
          region ? withinRegion(herds, region) : undefined,
          q.q ? or(ilike(herds.name, v.likePattern(q.q)), ilike(users.fullName, v.likePattern(q.q))) : undefined,
        ),
      )
      .orderBy(asc(herds.name), asc(herds.id))
      .limit(q.limit + 1)
      .offset(q.offset);
    const regionInfo = await describeRegions(db, rows.map((r) => r.herd.regionId));
    res.json(
      v.page(
        rows.map((r) => ({
          ...presentHerd(r.herd),
          owner: r.owner,
          region: regionInfo.get(r.herd.regionId) ?? null,
          animalCount: r.animalCount,
        })),
        q,
      ),
    );
  });

  router.post("/herds", canRegister, async (req, res) => {
    const me = currentUser(req);
    const body = z
      .object({
        id: v.uuid.optional(),
        name: v.text(120),
        regionId: v.uuid.optional(),
        lat: v.latitude.optional(),
        lng: v.longitude.optional(),
        address: v.text(300).optional(),
        ownerId: v.uuid.optional(),
        owner: ownerInput.optional(),
      })
      .parse(req.body);

    if (body.id) {
      const [existing] = await db.select().from(herds).where(eq(herds.id, body.id));
      if (existing) {
        if (existing.createdById !== me.id) throw conflict("A herd with this id already exists.");
        res.status(200).json(await herdDetail(db, me, existing.id));
        return;
      }
    }

    const id = await db.transaction(async (tx) => {
      const region = await herdRegionFor(tx, me, body.regionId);
      const ownerId = await resolveOwner(tx, me, body, region);
      const [created] = await tx
        .insert(herds)
        .values({
          id: body.id,
          name: body.name,
          ownerId,
          regionId: region.id,
          ...ancestryOf(region),
          lat: body.lat,
          lng: body.lng,
          address: body.address,
          createdById: me.id,
        })
        .returning({ id: herds.id });
      return created!.id;
    });
    res.status(201).json(await herdDetail(db, me, id));
  });

  router.get("/herds/:id", async (req, res) => {
    res.json(await herdDetail(db, currentUser(req), v.uuid.parse(req.params.id)));
  });

  router.patch("/herds/:id", canRegister, async (req, res) => {
    const me = currentUser(req);
    const id = v.uuid.parse(req.params.id);
    const body = z
      .object({
        name: v.text(120).optional(),
        regionId: v.uuid.optional(),
        lat: v.latitude.nullable().optional(),
        lng: v.longitude.nullable().optional(),
        address: v.text(300).nullable().optional(),
      })
      .strict()
      .parse(req.body);
    await loadWritableHerd(db, me, id);
    const { regionId, ...rest } = body;
    const region = regionId ? await herdRegionFor(db, me, regionId) : null;
    await db
      .update(herds)
      .set({ ...rest, ...(region && { regionId: region.id, ...ancestryOf(region) }) })
      .where(eq(herds.id, id));
    res.json(await herdDetail(db, me, id));
  });

  // --- Animals --------------------------------------------------------------

  router.get("/animals", async (req, res) => {
    const me = currentUser(req);
    const q = v.pagination
      .extend({
        herdId: v.uuid.optional(),
        species: v.queryList(z.enum(SPECIES)),
        status: v.queryList(z.enum(ANIMAL_STATUSES)),
        q: z.string().trim().min(1).max(80).optional(),
        updatedSince: v.isoDateTime.optional(),
      })
      .parse(req.query);
    const rows = await db
      .select({ animal: animals, herdName: herds.name, ownerId: herds.ownerId })
      .from(animals)
      .innerJoin(herds, eq(herds.id, animals.herdId))
      .where(
        and(
          herdVisibility(me),
          q.herdId ? eq(animals.herdId, q.herdId) : undefined,
          q.species ? inArray(animals.species, q.species) : undefined,
          q.status ? inArray(animals.status, q.status) : undefined,
          q.q ? or(ilike(animals.name, v.likePattern(q.q)), ilike(animals.tagNumber, v.likePattern(q.q))) : undefined,
          q.updatedSince ? gte(animals.updatedAt, new Date(q.updatedSince)) : undefined,
        ),
      )
      .orderBy(asc(animals.name), asc(animals.id))
      .limit(q.limit + 1)
      .offset(q.offset);
    res.json(v.page(rows.map((r) => ({ ...r.animal, herdName: r.herdName, ownerId: r.ownerId })), q));
  });

  /** Find an animal by ear tag — hospitals and field staff meet animals they have not seen before. */
  router.get("/animals/lookup", requireRole("vet", "ward_staff", "field_worker", "admin"), async (req, res) => {
    const { tag } = z.object({ tag: z.string().trim().min(3).max(40) }).parse(req.query);
    const [row] = await db
      .select({
        id: animals.id,
        tagNumber: animals.tagNumber,
        name: animals.name,
        species: animals.species,
        breed: animals.breed,
        status: animals.status,
        herdId: animals.herdId,
      })
      .from(animals)
      .where(eq(animals.tagNumber, tag));
    if (!row) throw notFound("Animal");
    res.json(row);
  });

  router.post("/animals", canRegister, async (req, res) => {
    const me = currentUser(req);
    const body = z
      .object({
        id: v.uuid.optional(),
        herdId: v.uuid,
        tagNumber: z.string().trim().min(3).max(40).optional(),
        name: v.text(80).optional(),
        species: z.enum(SPECIES),
        breed: v.text(80).optional(),
        sex: z.enum(ANIMAL_SEXES).default("unknown"),
        birthDate: v.isoDate.optional(),
        status: z.enum(["healthy", "sick", "under_treatment", "recovering"]).default("healthy"),
        notes: v.text(1000).optional(),
      })
      .parse(req.body);
    if (body.id) {
      const [existing] = await db.select().from(animals).where(eq(animals.id, body.id));
      if (existing) {
        if (existing.createdById !== me.id) throw conflict("An animal with this id already exists.");
        res.status(200).json(await animalDetail(db, me, existing.id));
        return;
      }
    }
    await loadWritableHerd(db, me, body.herdId);
    const [created] = await db
      .insert(animals)
      .values({ ...body, createdById: me.id })
      .returning({ id: animals.id });
    res.status(201).json(await animalDetail(db, me, created!.id));
  });

  router.get("/animals/:id", async (req, res) => {
    res.json(await animalDetail(db, currentUser(req), v.uuid.parse(req.params.id)));
  });

  router.patch("/animals/:id", canRegister, async (req, res) => {
    const me = currentUser(req);
    const id = v.uuid.parse(req.params.id);
    const body = z
      .object({
        herdId: v.uuid.optional(),
        tagNumber: z.string().trim().min(3).max(40).nullable().optional(),
        name: v.text(80).nullable().optional(),
        breed: v.text(80).nullable().optional(),
        sex: z.enum(ANIMAL_SEXES).optional(),
        birthDate: v.isoDate.nullable().optional(),
        // Deaths are recorded through /mortality so they reach outbreak statistics.
        status: z.enum(["healthy", "sick", "under_treatment", "recovering", "sold"]).optional(),
        notes: v.text(1000).nullable().optional(),
      })
      .strict()
      .parse(req.body);
    const { animal } = await loadVisibleAnimal(db, me, id);
    await loadWritableHerd(db, me, animal.herdId);
    if (animal.status === "dead") throw conflict("This animal is recorded as dead.");
    if (body.herdId && body.herdId !== animal.herdId) await loadWritableHerd(db, me, body.herdId);
    await db.update(animals).set(body).where(eq(animals.id, id));
    res.json(await animalDetail(db, me, id));
  });

  router.get("/animals/:id/history", async (req, res) => {
    const me = currentUser(req);
    const id = v.uuid.parse(req.params.id);
    await loadVisibleAnimal(db, me, id);
    res.json({ items: await animalHistory(db, id) });
  });

  // --- Mortality (architecture §3 "Record Mortality") ------------------------

  router.post("/mortality", canRegister, async (req, res) => {
    const me = currentUser(req);
    const body = z
      .object({
        id: v.uuid.optional(),
        herdId: v.uuid,
        animalId: v.uuid.optional(),
        count: z.number().int().min(1).max(100_000).default(1),
        diedOn: v.isoDate,
        suspectedCause: v.text(300).optional(),
        caseId: v.uuid.optional(),
        notes: v.text(1000).optional(),
      })
      .parse(req.body);
    if (body.animalId && body.count !== 1) throw badRequest("A single animal's death has count 1.");
    if (body.diedOn > new Date().toISOString().slice(0, 10)) throw badRequest("The date of death is in the future.");

    if (body.id) {
      const [existing] = await db.select().from(mortalityRecords).where(eq(mortalityRecords.id, body.id));
      if (existing) {
        if (existing.reportedById !== me.id) throw conflict("A record with this id already exists.");
        res.status(200).json(existing);
        return;
      }
    }

    const herd = await loadWritableHerd(db, me, body.herdId);
    const record = await db.transaction(async (tx) => {
      if (body.animalId) {
        const [animal] = await tx
          .select()
          .from(animals)
          .where(and(eq(animals.id, body.animalId), eq(animals.herdId, herd.id)));
        if (!animal) throw badRequest("That animal is not in this herd.", { field: "animalId" });
        if (animal.status === "dead") throw conflict("This animal is already recorded as dead.");
        await tx
          .update(animals)
          .set({ status: "dead", diedAt: new Date(`${body.diedOn}T00:00:00Z`) })
          .where(eq(animals.id, animal.id));
      }
      if (body.caseId) {
        const [c] = await tx.select({ herdId: cases.herdId }).from(cases).where(eq(cases.id, body.caseId));
        if (!c || c.herdId !== herd.id) throw badRequest("That case is not for this herd.", { field: "caseId" });
      }
      const [created] = await tx
        .insert(mortalityRecords)
        .values({ ...body, herdId: herd.id, reportedById: me.id })
        .returning();
      // Unexplained deaths are an early outbreak signal; tell the vets covering the area.
      if (!body.caseId) {
        await notify(
          tx,
          await vetsCovering(tx, herd),
          {
            type: "case_reported",
            title: "Livestock deaths reported",
            body: `${body.count} death${body.count > 1 ? "s" : ""} reported in ${herd.name}${
              body.suspectedCause ? ` — suspected ${body.suspectedCause}` : ""
            }.`,
            data: { herdId: herd.id, mortalityId: created!.id },
          },
          { exclude: me.id },
        );
      }
      return created!;
    });
    res.status(201).json(record);
  });

  router.get("/mortality", async (req, res) => {
    const me = currentUser(req);
    const q = v.pagination
      .extend({ herdId: v.uuid.optional(), from: v.isoDate.optional(), to: v.isoDate.optional() })
      .parse(req.query);
    const rows = await db
      .select({ record: mortalityRecords, herdName: herds.name })
      .from(mortalityRecords)
      .innerJoin(herds, eq(herds.id, mortalityRecords.herdId))
      .where(
        and(
          herdVisibility(me),
          q.herdId ? eq(mortalityRecords.herdId, q.herdId) : undefined,
          q.from ? gte(mortalityRecords.diedOn, q.from) : undefined,
          q.to ? sql`${mortalityRecords.diedOn} <= ${q.to}` : undefined,
        ),
      )
      .orderBy(desc(mortalityRecords.diedOn), desc(mortalityRecords.createdAt))
      .limit(q.limit + 1)
      .offset(q.offset);
    res.json(v.page(rows.map((r) => ({ ...r.record, herdName: r.herdName })), q));
  });

  return router;
}

function presentHerd(h: typeof herds.$inferSelect) {
  return {
    id: h.id,
    name: h.name,
    ownerId: h.ownerId,
    regionId: h.regionId,
    lat: h.lat,
    lng: h.lng,
    address: h.address,
    createdById: h.createdById,
    createdAt: h.createdAt,
    updatedAt: h.updatedAt,
  };
}

async function herdDetail(db: Db, me: CurrentUser, id: string) {
  const herd = await loadVisibleHerd(db, me, id);
  const [owner] = await db
    .select({ id: users.id, fullName: users.fullName, phone: users.phone, role: users.role })
    .from(users)
    .where(eq(users.id, herd.ownerId));
  const herdAnimals = await db
    .select()
    .from(animals)
    .where(eq(animals.herdId, id))
    .orderBy(asc(animals.name), asc(animals.id));
  return {
    ...presentHerd(herd),
    owner: owner ?? null,
    region: await describeRegion(db, herd.regionId),
    animals: herdAnimals,
  };
}

async function animalDetail(db: Db, me: CurrentUser, id: string) {
  const { animal, herd } = await loadVisibleAnimal(db, me, id);
  const [owner] = await db
    .select({ id: users.id, fullName: users.fullName, role: users.role, phone: users.phone })
    .from(users)
    .where(eq(users.id, herd.ownerId));
  const [admission] = await db
    .select({ admission: admissions, organizationName: organizations.name })
    .from(admissions)
    .innerJoin(organizations, eq(organizations.id, admissions.organizationId))
    .where(and(eq(admissions.animalId, id), isNull(admissions.dischargedAt)));
  const openCases = await db
    .select({
      id: cases.id,
      caseNumber: cases.caseNumber,
      status: cases.status,
      riskLevel: cases.riskLevel,
      createdAt: cases.createdAt,
    })
    .from(cases)
    .where(and(eq(cases.animalId, id), notInArray(cases.status, ["resolved"])))
    .orderBy(desc(cases.createdAt));
  return {
    ...animal,
    herd: { id: herd.id, name: herd.name, regionId: herd.regionId },
    owner: owner ? presentPerson(owner) : null,
    region: await describeRegion(db, herd.regionId),
    currentAdmission: admission ? { ...admission.admission, organizationName: admission.organizationName } : null,
    vaccinations: await vaccinationStatus(db, id),
    openCases,
  };
}

type HistoryEntry = { type: string; date: string; id: string; summary: string; data: Record<string, unknown> };

/** Everything that happened to an animal, newest first (architecture §3 "Animal / Herd History"). */
async function animalHistory(db: Db, animalId: string): Promise<HistoryEntry[]> {
  const [caseRows, treatmentRows, vaccinationRows, labRows, deathRows, admissionRows] = await Promise.all([
    db.select().from(cases).where(eq(cases.animalId, animalId)),
    db.select().from(treatments).where(eq(treatments.animalId, animalId)),
    db
      .select({ v: vaccinations, name: vaccines.name })
      .from(vaccinations)
      .innerJoin(vaccines, eq(vaccines.code, vaccinations.vaccineCode))
      .where(eq(vaccinations.animalId, animalId)),
    db.select().from(labRequests).where(eq(labRequests.animalId, animalId)),
    db.select().from(mortalityRecords).where(eq(mortalityRecords.animalId, animalId)),
    db
      .select({ a: admissions, org: organizations.name })
      .from(admissions)
      .innerJoin(organizations, eq(organizations.id, admissions.organizationId))
      .where(eq(admissions.animalId, animalId)),
  ]);
  const entries: HistoryEntry[] = [
    ...caseRows.map((c) => ({
      type: "case",
      date: c.reportedAt.toISOString(),
      id: c.id,
      summary: `Case ${c.caseNumber} reported (${c.status.replace("_", " ")})`,
      data: { caseNumber: c.caseNumber, status: c.status, riskLevel: c.riskLevel, outcome: c.outcome },
    })),
    ...treatmentRows.map((t) => ({
      type: "treatment",
      date: t.startDate,
      id: t.id,
      summary: `Treated with ${t.medicine}${t.dosage ? ` (${t.dosage})` : ""}`,
      data: { caseId: t.caseId, instructions: t.instructions, withdrawalPeriodDays: t.withdrawalPeriodDays },
    })),
    ...vaccinationRows.map(({ v: row, name }) => ({
      type: "vaccination",
      date: row.administeredOn,
      id: row.id,
      summary: `Vaccinated: ${name}`,
      data: { vaccineCode: row.vaccineCode, nextDueOn: row.nextDueOn },
    })),
    ...labRows.map((l) => ({
      type: "lab",
      date: (l.completedAt ?? l.createdAt).toISOString(),
      id: l.id,
      summary: l.result
        ? `Lab ${l.requestNumber}: ${l.result}${l.resultSummary ? ` — ${l.resultSummary}` : ""}`
        : `Lab ${l.requestNumber} ${l.status}`,
      data: { caseId: l.caseId, status: l.status, result: l.result },
    })),
    ...deathRows.map((d) => ({
      type: "mortality",
      date: d.diedOn,
      id: d.id,
      summary: `Died${d.suspectedCause ? ` — suspected ${d.suspectedCause}` : ""}`,
      data: { caseId: d.caseId },
    })),
    ...admissionRows.map(({ a, org }) => ({
      type: "admission",
      date: a.admittedAt.toISOString(),
      id: a.id,
      summary: `Admitted to ${org} (${a.ward})${a.dischargedAt ? ", since discharged" : ""}`,
      data: { dischargedAt: a.dischargedAt, caseId: a.caseId },
    })),
  ];
  return entries.sort((a, b) => b.date.localeCompare(a.date));
}

