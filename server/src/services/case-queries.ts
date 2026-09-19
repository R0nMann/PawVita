import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { CurrentUser } from "../auth/middleware.js";
import type { Db } from "../db/client.js";
import {
  aiAssessments,
  animals,
  attachments,
  caseEvents,
  caseSymptoms,
  diseases,
  fieldVisits,
  herds,
  labRequests,
  organizations,
  symptoms,
  treatments,
  users,
} from "../db/schema.js";
import type { Deps } from "../deps.js";
import { isReporterSide, loadVisibleCase } from "../lib/access.js";
import { describeRegion } from "../lib/regions.js";
import { API_PREFIX } from "../lib/constants.js";
import type { StorageProvider } from "../storage/index.js";
import { presentPerson } from "./users.js";
import { vaccinationStatus } from "./animals.js";

export function presentAttachment(a: typeof attachments.$inferSelect) {
  return {
    id: a.id,
    kind: a.kind,
    contentType: a.contentType,
    sizeBytes: a.sizeBytes,
    originalName: a.originalName,
    caseId: a.caseId,
    labRequestId: a.labRequestId,
    animalId: a.animalId,
    uploadedById: a.uploadedById,
    createdAt: a.createdAt,
    contentUrl: `${API_PREFIX}/attachments/${a.id}/content`,
  };
}

/** How long embedded file links stay valid. */
export const FILE_URL_TTL_SECONDS = 10 * 60;

/** Attachments with a short-lived `url` that works in an `<img>` or `<audio>` tag without a token. */
export async function presentAttachments(storage: StorageProvider, rows: (typeof attachments.$inferSelect)[]) {
  const urlExpiresAt = new Date(Date.now() + FILE_URL_TTL_SECONDS * 1000);
  return Promise.all(
    rows.map(async (a) => ({
      ...presentAttachment(a),
      url: await storage.signedUrl(a.storageKey, FILE_URL_TTL_SECONDS),
      urlExpiresAt,
    })),
  );
}

/** Timeline entries with actor names; farmers only see entries meant for them. */
export async function caseTimeline(db: Db, me: CurrentUser, caseId: string) {
  const actor = alias(users, "actor");
  const rows = await db
    .select({ event: caseEvents, actorName: actor.fullName, actorRole: actor.role })
    .from(caseEvents)
    .leftJoin(actor, eq(actor.id, caseEvents.actorId))
    .where(
      and(eq(caseEvents.caseId, caseId), isReporterSide(me) ? eq(caseEvents.visibleToReporter, true) : undefined),
    )
    .orderBy(asc(caseEvents.createdAt), asc(caseEvents.id));
  return rows.map(({ event, actorName, actorRole }) => ({
    id: event.id,
    type: event.type,
    fromStatus: event.fromStatus,
    toStatus: event.toStatus,
    body: event.body,
    data: event.data,
    visibleToReporter: event.visibleToReporter,
    actor: event.actorId ? { id: event.actorId, fullName: actorName, role: actorRole } : null,
    createdAt: event.createdAt,
  }));
}

/** What the current user may do on this case — lets the UI show the right buttons. */
export function casePermissions(me: CurrentUser) {
  const clinical = me.role === "vet" || me.role === "admin";
  return {
    changeStatus: clinical,
    updateAssessment: clinical,
    addTreatment: clinical,
    requestLab: clinical,
    reviewAi: clinical,
    assign: clinical || me.role === "official",
    addNote: me.role !== "official",
    addAttachment: me.role !== "official" && me.role !== "lab_tech",
  };
}

/** Everything the vet's case-review screen and the farmer's case-status screen need (§9). */
export async function caseDetail(deps: Pick<Deps, "db" | "storage">, me: CurrentUser, caseId: string) {
  const { db } = deps;
  const c = await loadVisibleCase(db, me, caseId);
  const reporterSide = isReporterSide(me);

  const [herdRow] = await db
    .select({ herd: herds, owner: { id: users.id, fullName: users.fullName, role: users.role, phone: users.phone } })
    .from(herds)
    .innerJoin(users, eq(users.id, herds.ownerId))
    .where(eq(herds.id, c.herdId));
  const personIds = [c.reportedById, c.assignedVetId].filter((v): v is string => !!v);
  const people = new Map(
    (
      await db
        .select({ id: users.id, fullName: users.fullName, role: users.role, phone: users.phone })
        .from(users)
        .where(inArray(users.id, personIds))
    ).map((p) => [p.id, p]),
  );
  const [animal] = c.animalId ? await db.select().from(animals).where(eq(animals.id, c.animalId)) : [];
  const [assignedOrg] = c.assignedOrgId
    ? await db
        .select({ id: organizations.id, name: organizations.name, type: organizations.type, phone: organizations.phone })
        .from(organizations)
        .where(eq(organizations.id, c.assignedOrgId))
    : [];

  const [symptomRows, diseaseRows, attachmentRows, aiRows, treatmentRows, labRows, visitRows] = await Promise.all([
    db
      .select({ code: symptoms.code, name: symptoms.name, category: symptoms.category, icon: symptoms.icon, translations: symptoms.translations })
      .from(caseSymptoms)
      .innerJoin(symptoms, eq(symptoms.code, caseSymptoms.symptomCode))
      .where(eq(caseSymptoms.caseId, c.id)),
    db
      .select({ code: diseases.code, name: diseases.name, notifiable: diseases.notifiable })
      .from(diseases)
      .where(
        inArray(diseases.code, [c.suspectedDiseaseCode, c.confirmedDiseaseCode].filter((d): d is string => !!d)),
      ),
    db.select().from(attachments).where(eq(attachments.caseId, c.id)).orderBy(asc(attachments.createdAt)),
    db.select().from(aiAssessments).where(eq(aiAssessments.caseId, c.id)).orderBy(desc(aiAssessments.requestedAt)),
    db.select().from(treatments).where(eq(treatments.caseId, c.id)).orderBy(asc(treatments.createdAt)),
    db.select().from(labRequests).where(eq(labRequests.caseId, c.id)).orderBy(asc(labRequests.createdAt)),
    db.select().from(fieldVisits).where(eq(fieldVisits.caseId, c.id)).orderBy(asc(fieldVisits.scheduledAt)),
  ]);
  const disease = (code: string | null) => (code ? (diseaseRows.find((d) => d.code === code) ?? { code }) : null);
  // Staff contact numbers are shown to farmers; one farmer never sees another's number.
  const present = (p: { id: string; fullName: string; role: CurrentUser["role"]; phone: string | null }) =>
    me.role === "farmer" && p.role === "farmer" && p.id !== me.id ? presentPerson({ ...p, phone: undefined }) : presentPerson(p);
  const person = (id: string | null) => {
    const p = id ? people.get(id) : undefined;
    return p ? present(p) : null;
  };

  return {
    id: c.id,
    caseNumber: c.caseNumber,
    status: c.status,
    riskLevel: c.riskLevel,
    outcome: c.outcome,
    suspectedDisease: disease(c.suspectedDiseaseCode),
    confirmedDisease: disease(c.confirmedDiseaseCode),
    description: c.description,
    animalsAffected: c.animalsAffected,
    animalsDead: c.animalsDead,
    onsetDate: c.onsetDate,
    priorTreatmentNotes: c.priorTreatmentNotes,
    priorVaccinationNotes: c.priorVaccinationNotes,
    location: { lat: c.lat, lng: c.lng, accuracyM: c.locationAccuracyM },
    region: await describeRegion(db, c.regionId),
    capturedOffline: c.capturedOffline,
    reportedAt: c.reportedAt,
    firstResponseAt: c.firstResponseAt,
    resolvedAt: c.resolvedAt,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    herd: herdRow
      ? { id: herdRow.herd.id, name: herdRow.herd.name, lat: herdRow.herd.lat, lng: herdRow.herd.lng, address: herdRow.herd.address }
      : null,
    owner: herdRow ? present(herdRow.owner) : null,
    reporter: person(c.reportedById),
    animal: animal
      ? {
          id: animal.id,
          name: animal.name,
          tagNumber: animal.tagNumber,
          species: animal.species,
          breed: animal.breed,
          sex: animal.sex,
          birthDate: animal.birthDate,
          status: animal.status,
          vaccinations: await vaccinationStatus(db, animal.id),
        }
      : null,
    assignedVet: person(c.assignedVetId),
    assignedOrganization: assignedOrg ?? null,
    symptoms: symptomRows.map((s) => ({
      code: s.code,
      name: s.name,
      category: s.category,
      icon: s.icon,
      label: s.translations[me.preferredLanguage] ?? s.name,
    })),
    attachments: await presentAttachments(deps.storage, attachmentRows),
    aiAssessments: aiRows,
    treatments: treatmentRows.map((t) => (reporterSide ? { ...t, notes: undefined } : t)),
    labRequests: labRows.map((l) =>
      reporterSide
        ? {
            id: l.id,
            requestNumber: l.requestNumber,
            status: l.status,
            sampleType: l.sampleType,
            tests: l.tests,
            result: l.result,
            resultSummary: l.resultSummary,
            completedAt: l.completedAt,
            createdAt: l.createdAt,
          }
        : l,
    ),
    visits: visitRows,
    timeline: await caseTimeline(db, me, c.id),
    permissions: casePermissions(me),
  };
}
