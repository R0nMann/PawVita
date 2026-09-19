import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

/**
 * Everything lives in the `pawvita` schema rather than `public`.
 *
 * Supabase's Data API (PostgREST) exposes `public` to anyone holding the
 * publishable/anon key, which ships inside every frontend. The architecture
 * routes all reads and writes through Express, so the tables are kept out of
 * the exposed schema and RLS is enabled with no policies as a second lock:
 * only the backend's direct Postgres connection (the table owner) gets in.
 */
export const app = pgSchema("pawvita");

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const REGION_LEVELS = ["country", "state", "district", "block", "village"] as const;
export const regionLevel = app.enum("region_level", REGION_LEVELS);

/**
 * One role set for both portals. The frontend's portal choice is presentation
 * only: user-portal "vet" and hospital-portal "doctor" are both `vet`.
 */
export const USER_ROLES = [
  "farmer",
  "field_worker",
  "vet",
  "ward_staff",
  "lab_tech",
  "official",
  "admin",
] as const;
export const userRole = app.enum("user_role", USER_ROLES);

export const ACCOUNT_STATUSES = ["pending", "active", "suspended"] as const;
export const accountStatus = app.enum("account_status", ACCOUNT_STATUSES);

export const ORGANIZATION_TYPES = ["hospital", "lab", "department", "other"] as const;
export const organizationType = app.enum("organization_type", ORGANIZATION_TYPES);

export const SPECIES = [
  "cattle",
  "buffalo",
  "goat",
  "sheep",
  "pig",
  "poultry",
  "horse",
  "camel",
  "other",
] as const;
export const species = app.enum("species", SPECIES);

export const ANIMAL_SEXES = ["male", "female", "unknown"] as const;
export const animalSex = app.enum("animal_sex", ANIMAL_SEXES);

export const ANIMAL_STATUSES = [
  "healthy",
  "sick",
  "under_treatment",
  "recovering",
  "dead",
  "sold",
] as const;
export const animalStatus = app.enum("animal_status", ANIMAL_STATUSES);

/** Architecture §9: Active → Under Review → Lab Pending → Treated → Resolved. */
export const CASE_STATUSES = ["active", "under_review", "lab_pending", "treated", "resolved"] as const;
export const caseStatus = app.enum("case_status", CASE_STATUSES);

/** Architecture §7: Low → monitor, Moderate → vet review, High → urgent attention. */
export const RISK_LEVELS = ["low", "moderate", "high"] as const;
export const riskLevel = app.enum("risk_level", RISK_LEVELS);

export const CASE_OUTCOMES = ["recovered", "died", "culled", "false_alarm", "other"] as const;
export const caseOutcome = app.enum("case_outcome", CASE_OUTCOMES);

export const CASE_EVENT_TYPES = [
  "created",
  "status_changed",
  "assigned",
  "note",
  "advice",
  "assessment_updated",
  "treatment_added",
  "lab_requested",
  "lab_status_changed",
  "lab_result",
  "vaccination_recorded",
  "visit_scheduled",
  "attachment_added",
  "ai_assessment",
  "ai_reviewed",
] as const;
export const caseEventType = app.enum("case_event_type", CASE_EVENT_TYPES);

export const LAB_PRIORITIES = ["routine", "normal", "high", "urgent"] as const;
export const labPriority = app.enum("lab_priority", LAB_PRIORITIES);

export const LAB_STATUSES = [
  "requested",
  "collected",
  "received",
  "processing",
  "completed",
  "rejected",
] as const;
export const labStatus = app.enum("lab_status", LAB_STATUSES);

export const LAB_RESULTS = ["positive", "negative", "inconclusive"] as const;
export const labResult = app.enum("lab_result", LAB_RESULTS);

export const VISIT_TYPES = ["investigation", "follow_up", "vaccination", "other"] as const;
export const visitType = app.enum("visit_type", VISIT_TYPES);

export const VISIT_STATUSES = ["scheduled", "in_progress", "completed", "cancelled"] as const;
export const visitStatus = app.enum("visit_status", VISIT_STATUSES);

export const ATTACHMENT_KINDS = ["photo", "voice", "document", "lab_report"] as const;
export const attachmentKind = app.enum("attachment_kind", ATTACHMENT_KINDS);

export const AI_MODULES = ["vision", "clinical", "outbreak", "combined"] as const;
export const aiModule = app.enum("ai_module", AI_MODULES);

export const AI_STATUSES = ["pending", "completed", "failed"] as const;
export const aiStatus = app.enum("ai_status", AI_STATUSES);

export const AI_REVIEW_DECISIONS = ["accepted", "rejected", "modified"] as const;
export const aiReviewDecision = app.enum("ai_review_decision", AI_REVIEW_DECISIONS);

export const ADVISORY_SEVERITIES = ["info", "low", "moderate", "high"] as const;
export const advisorySeverity = app.enum("advisory_severity", ADVISORY_SEVERITIES);

export const ADVISORY_CATEGORIES = ["outbreak", "vaccination", "weather", "treatment", "general"] as const;
export const advisoryCategory = app.enum("advisory_category", ADVISORY_CATEGORIES);

export const NOTIFICATION_TYPES = [
  "case_reported",
  "case_status",
  "case_assigned",
  "advice",
  "treatment",
  "lab_request",
  "lab_result",
  "vaccination_reminder",
  "visit",
  "account",
  "system",
] as const;
export const notificationType = app.enum("notification_type", NOTIFICATION_TYPES);

// ---------------------------------------------------------------------------
// Shared column helpers
// ---------------------------------------------------------------------------

const id = () => uuid().primaryKey().defaultRandom();
const createdAt = () => timestamp({ withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

/**
 * Denormalised location ancestry. A row carries the id of every region above
 * it (and itself, at its own level), so "cases in district X" is
 * `district_id = X` and village → block → district roll-ups are a GROUP BY.
 */
const ancestry = () => ({
  stateId: uuid().references((): AnyPgColumn => regions.id),
  districtId: uuid().references((): AnyPgColumn => regions.id),
  blockId: uuid().references((): AnyPgColumn => regions.id),
  villageId: uuid().references((): AnyPgColumn => regions.id),
});

// ---------------------------------------------------------------------------
// Locations and organisations
// ---------------------------------------------------------------------------

export const regions = app
  .table(
    "regions",
    {
      id: id(),
      parentId: uuid().references((): AnyPgColumn => regions.id, { onDelete: "restrict" }),
      level: regionLevel().notNull(),
      name: text().notNull(),
      /** LGD (Local Government Directory) code where known. */
      code: text().unique(),
      lat: doublePrecision(),
      lng: doublePrecision(),
      ...ancestry(),
      createdAt: createdAt(),
    },
    (t) => [index().on(t.parentId), index().on(t.level)],
  )
  .enableRLS();

export const organizations = app
  .table(
    "organizations",
    {
      id: id(),
      type: organizationType().notNull(),
      name: text().notNull(),
      /** Short login-friendly identifier, e.g. `vh-pune-01`. */
      code: text().notNull().unique(),
      regionId: uuid().references(() => regions.id),
      address: text(),
      phone: text(),
      email: text(),
      createdAt: createdAt(),
      updatedAt: updatedAt(),
    },
    (t) => [index().on(t.type)],
  )
  .enableRLS();

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

export const users = app
  .table(
    "users",
    {
      id: id(),
      /**
       * Supabase `auth.users.id`. Nullable because a field worker can register
       * a farmer who has no phone login yet; the account is linked by phone
       * number the first time that farmer verifies an OTP.
       */
      authUserId: uuid().unique(),
      role: userRole().notNull(),
      status: accountStatus().notNull().default("pending"),
      fullName: text().notNull(),
      /** E.164, e.g. +919876543210. */
      phone: text().unique(),
      /** Lower-cased. */
      email: text().unique(),
      /** Lower-cased staff login handle — the "institution ID" on the sign-in screen. */
      username: text().unique(),
      organizationId: uuid().references(() => organizations.id),
      /** Home village for farmers; area of responsibility for staff. */
      regionId: uuid().references(() => regions.id),
      preferredLanguage: text().notNull().default("en"),
      createdById: uuid().references((): AnyPgColumn => users.id),
      approvedById: uuid().references((): AnyPgColumn => users.id),
      approvedAt: timestamp({ withTimezone: true }),
      createdAt: createdAt(),
      updatedAt: updatedAt(),
    },
    (t) => [index().on(t.role, t.status), index().on(t.regionId), index().on(t.organizationId)],
  )
  .enableRLS();

// ---------------------------------------------------------------------------
// Herds and animals
// ---------------------------------------------------------------------------

export const herds = app
  .table(
    "herds",
    {
      id: id(),
      ownerId: uuid()
        .notNull()
        .references(() => users.id),
      name: text().notNull(),
      regionId: uuid()
        .notNull()
        .references(() => regions.id),
      ...ancestry(),
      lat: doublePrecision(),
      lng: doublePrecision(),
      address: text(),
      createdById: uuid()
        .notNull()
        .references(() => users.id),
      createdAt: createdAt(),
      updatedAt: updatedAt(),
    },
    (t) => [
      index().on(t.ownerId),
      index().on(t.districtId),
      index().on(t.blockId),
      index().on(t.villageId),
    ],
  )
  .enableRLS();

export const animals = app
  .table(
    "animals",
    {
      id: id(),
      herdId: uuid()
        .notNull()
        .references(() => herds.id),
      /** Ear tag / Pashu Aadhaar (INAPH) number. */
      tagNumber: text().unique(),
      name: text(),
      species: species().notNull(),
      breed: text(),
      sex: animalSex().notNull().default("unknown"),
      birthDate: date({ mode: "string" }),
      status: animalStatus().notNull().default("healthy"),
      diedAt: timestamp({ withTimezone: true }),
      notes: text(),
      createdById: uuid()
        .notNull()
        .references(() => users.id),
      createdAt: createdAt(),
      updatedAt: updatedAt(),
    },
    (t) => [index().on(t.herdId), index().on(t.species)],
  )
  .enableRLS();

// ---------------------------------------------------------------------------
// Reference catalogues
// ---------------------------------------------------------------------------

/** Translations keyed by language code: `{ "hi": "तेज़ बुखार" }`. */
type Translations = Record<string, string>;

export const symptoms = app
  .table("symptoms", {
    code: text().primaryKey(),
    name: text().notNull(),
    category: text().notNull(),
    icon: text(),
    translations: jsonb().$type<Translations>().notNull().default({}),
  })
  .enableRLS();

export const diseases = app
  .table("diseases", {
    code: text().primaryKey(),
    name: text().notNull(),
    /** Must be reported to the state Animal Husbandry Department. */
    notifiable: boolean().notNull().default(false),
    species: species().array().notNull().default(sql`'{}'`),
    translations: jsonb().$type<Translations>().notNull().default({}),
  })
  .enableRLS();

export const vaccines = app
  .table("vaccines", {
    code: text().primaryKey(),
    name: text().notNull(),
    diseaseCodes: text().array().notNull().default(sql`'{}'`),
    species: species().array().notNull().default(sql`'{}'`),
    /** Re-vaccination interval. Null for single-dose vaccines such as Brucella S19. */
    boosterIntervalDays: integer(),
  })
  .enableRLS();

// ---------------------------------------------------------------------------
// Cases
// ---------------------------------------------------------------------------

export const caseNumberSeq = app.sequence("case_number_seq", { startWith: 1 });
export const labRequestNumberSeq = app.sequence("lab_request_number_seq", { startWith: 1 });

export const cases = app
  .table(
    "cases",
    {
      /** May be generated by the client so offline re-submissions are idempotent. */
      id: id(),
      caseNumber: text().notNull().unique(),
      herdId: uuid()
        .notNull()
        .references(() => herds.id),
      /** Null for herd-level reports (e.g. several birds sick in a flock). */
      animalId: uuid().references(() => animals.id),
      reportedById: uuid()
        .notNull()
        .references(() => users.id),
      status: caseStatus().notNull().default("active"),
      riskLevel: riskLevel(),
      suspectedDiseaseCode: text().references(() => diseases.code),
      confirmedDiseaseCode: text().references(() => diseases.code),
      outcome: caseOutcome(),
      description: text(),
      animalsAffected: integer().notNull().default(1),
      animalsDead: integer().notNull().default(0),
      onsetDate: date({ mode: "string" }),
      priorTreatmentNotes: text(),
      priorVaccinationNotes: text(),
      lat: doublePrecision(),
      lng: doublePrecision(),
      locationAccuracyM: doublePrecision(),
      regionId: uuid()
        .notNull()
        .references(() => regions.id),
      ...ancestry(),
      assignedVetId: uuid().references(() => users.id),
      assignedOrgId: uuid().references(() => organizations.id),
      /** Captured without connectivity and delivered later by background sync. */
      capturedOffline: boolean().notNull().default(false),
      /** When the report was captured on the device (may precede createdAt when offline). */
      reportedAt: timestamp({ withTimezone: true }).notNull(),
      /** First veterinary action — drives the response-time KPI. */
      firstResponseAt: timestamp({ withTimezone: true }),
      resolvedAt: timestamp({ withTimezone: true }),
      createdAt: createdAt(),
      updatedAt: updatedAt(),
    },
    (t) => [
      index().on(t.status),
      index().on(t.herdId),
      index().on(t.animalId),
      index().on(t.reportedById),
      index().on(t.assignedVetId),
      index().on(t.assignedOrgId),
      index().on(t.districtId, t.createdAt),
      index().on(t.blockId),
      index().on(t.villageId),
      index().on(t.createdAt),
      index().on(t.updatedAt),
      check("cases_animals_affected_positive", sql`${t.animalsAffected} >= 1`),
      check("cases_animals_dead_non_negative", sql`${t.animalsDead} >= 0`),
    ],
  )
  .enableRLS();

export const caseSymptoms = app
  .table(
    "case_symptoms",
    {
      caseId: uuid()
        .notNull()
        .references(() => cases.id, { onDelete: "cascade" }),
      symptomCode: text()
        .notNull()
        .references(() => symptoms.code),
    },
    (t) => [primaryKey({ columns: [t.caseId, t.symptomCode] })],
  )
  .enableRLS();

/**
 * Append-only case timeline. Drives the farmer's case-status view, the vet's
 * audit trail and the "feedback to farmer" loop (§10).
 */
export const caseEvents = app
  .table(
    "case_events",
    {
      id: id(),
      caseId: uuid()
        .notNull()
        .references(() => cases.id, { onDelete: "cascade" }),
      type: caseEventType().notNull(),
      /** Null for system-generated events. */
      actorId: uuid().references(() => users.id),
      fromStatus: caseStatus(),
      toStatus: caseStatus(),
      body: text(),
      data: jsonb().$type<Record<string, unknown>>().notNull().default({}),
      /** Shown to the farmer / reporter. Internal clinical notes are not. */
      visibleToReporter: boolean().notNull().default(false),
      createdAt: createdAt(),
    },
    (t) => [index().on(t.caseId, t.createdAt)],
  )
  .enableRLS();

// ---------------------------------------------------------------------------
// Clinical records
// ---------------------------------------------------------------------------

export const treatments = app
  .table(
    "treatments",
    {
      id: id(),
      caseId: uuid().references(() => cases.id),
      animalId: uuid().references(() => animals.id),
      medicine: text().notNull(),
      dosage: text(),
      route: text(),
      frequency: text(),
      durationDays: integer(),
      startDate: date({ mode: "string" }).notNull().defaultNow(),
      /** Milk / meat withdrawal period the farmer must observe. */
      withdrawalPeriodDays: integer(),
      /** Shown to the farmer. */
      instructions: text(),
      notes: text(),
      prescribedById: uuid()
        .notNull()
        .references(() => users.id),
      createdAt: createdAt(),
    },
    (t) => [
      index().on(t.caseId),
      index().on(t.animalId),
      check("treatments_subject", sql`${t.caseId} is not null or ${t.animalId} is not null`),
    ],
  )
  .enableRLS();

export const vaccinations = app
  .table(
    "vaccinations",
    {
      id: id(),
      animalId: uuid()
        .notNull()
        .references(() => animals.id),
      vaccineCode: text()
        .notNull()
        .references(() => vaccines.code),
      administeredOn: date({ mode: "string" }).notNull(),
      /** Derived from the vaccine's booster interval unless given explicitly. */
      nextDueOn: date({ mode: "string" }),
      doseNumber: integer(),
      batchNumber: text(),
      administeredById: uuid().references(() => users.id),
      recordedById: uuid()
        .notNull()
        .references(() => users.id),
      caseId: uuid().references(() => cases.id),
      notes: text(),
      createdAt: createdAt(),
    },
    (t) => [index().on(t.animalId, t.vaccineCode, t.administeredOn), index().on(t.nextDueOn)],
  )
  .enableRLS();

export const mortalityRecords = app
  .table(
    "mortality_records",
    {
      id: id(),
      herdId: uuid()
        .notNull()
        .references(() => herds.id),
      /** Null for flock-level deaths where animals are not individually tagged. */
      animalId: uuid().references(() => animals.id),
      count: integer().notNull().default(1),
      diedOn: date({ mode: "string" }).notNull(),
      suspectedCause: text(),
      caseId: uuid().references(() => cases.id),
      reportedById: uuid()
        .notNull()
        .references(() => users.id),
      notes: text(),
      createdAt: createdAt(),
    },
    (t) => [
      index().on(t.herdId),
      index().on(t.diedOn),
      check("mortality_count_positive", sql`${t.count} >= 1`),
    ],
  )
  .enableRLS();

export const labRequests = app
  .table(
    "lab_requests",
    {
      id: id(),
      requestNumber: text().notNull().unique(),
      caseId: uuid()
        .notNull()
        .references(() => cases.id),
      animalId: uuid().references(() => animals.id),
      requestedById: uuid()
        .notNull()
        .references(() => users.id),
      labOrgId: uuid().references(() => organizations.id),
      sampleType: text().notNull(),
      tests: text().array().notNull().default(sql`'{}'`),
      priority: labPriority().notNull().default("normal"),
      status: labStatus().notNull().default("requested"),
      notes: text(),
      collectedAt: timestamp({ withTimezone: true }),
      receivedAt: timestamp({ withTimezone: true }),
      processingStartedAt: timestamp({ withTimezone: true }),
      completedAt: timestamp({ withTimezone: true }),
      result: labResult(),
      resultDiseaseCode: text().references(() => diseases.code),
      resultSummary: text(),
      resultDetails: text(),
      rejectionReason: text(),
      processedById: uuid().references(() => users.id),
      createdAt: createdAt(),
      updatedAt: updatedAt(),
    },
    (t) => [index().on(t.labOrgId, t.status), index().on(t.caseId), index().on(t.requestedById)],
  )
  .enableRLS();

export const fieldVisits = app
  .table(
    "field_visits",
    {
      id: id(),
      caseId: uuid().references(() => cases.id),
      herdId: uuid()
        .notNull()
        .references(() => herds.id),
      vetId: uuid()
        .notNull()
        .references(() => users.id),
      type: visitType().notNull().default("follow_up"),
      status: visitStatus().notNull().default("scheduled"),
      scheduledAt: timestamp({ withTimezone: true }).notNull(),
      purpose: text(),
      notes: text(),
      completedAt: timestamp({ withTimezone: true }),
      createdById: uuid()
        .notNull()
        .references(() => users.id),
      createdAt: createdAt(),
      updatedAt: updatedAt(),
    },
    (t) => [index().on(t.vetId, t.scheduledAt), index().on(t.caseId), index().on(t.herdId)],
  )
  .enableRLS();

/** Hospital ward stays — the hospital portal's "digital herd view". */
export const admissions = app
  .table(
    "admissions",
    {
      id: id(),
      animalId: uuid()
        .notNull()
        .references(() => animals.id),
      organizationId: uuid()
        .notNull()
        .references(() => organizations.id),
      ward: text().notNull(),
      reason: text(),
      caseId: uuid().references(() => cases.id),
      admittedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
      admittedById: uuid()
        .notNull()
        .references(() => users.id),
      dischargedAt: timestamp({ withTimezone: true }),
      dischargedById: uuid().references(() => users.id),
      dischargeNotes: text(),
    },
    (t) => [
      index().on(t.organizationId, t.dischargedAt),
      // An animal can be in at most one ward at a time.
      uniqueIndex("admissions_one_open_per_animal")
        .on(t.animalId)
        .where(sql`${t.dischargedAt} is null`),
    ],
  )
  .enableRLS();

export const attachments = app
  .table(
    "attachments",
    {
      id: id(),
      kind: attachmentKind().notNull(),
      storageKey: text().notNull().unique(),
      contentType: text().notNull(),
      sizeBytes: integer().notNull(),
      originalName: text(),
      caseId: uuid().references(() => cases.id),
      labRequestId: uuid().references(() => labRequests.id),
      animalId: uuid().references(() => animals.id),
      uploadedById: uuid()
        .notNull()
        .references(() => users.id),
      createdAt: createdAt(),
    },
    (t) => [
      index().on(t.caseId),
      index().on(t.labRequestId),
      index().on(t.animalId),
      check(
        "attachments_owner",
        sql`${t.caseId} is not null or ${t.labRequestId} is not null or ${t.animalId} is not null`,
      ),
    ],
  )
  .enableRLS();

// ---------------------------------------------------------------------------
// AI results (written by the AI hook once the AI services exist)
// ---------------------------------------------------------------------------

export interface AiPrediction {
  label: string;
  confidence: number;
  /** Optional bounding box or region reference from the vision model. */
  region?: unknown;
}

export const aiAssessments = app
  .table(
    "ai_assessments",
    {
      id: id(),
      caseId: uuid()
        .notNull()
        .references(() => cases.id, { onDelete: "cascade" }),
      module: aiModule().notNull(),
      status: aiStatus().notNull().default("pending"),
      modelName: text(),
      modelVersion: text(),
      predictions: jsonb().$type<AiPrediction[]>().notNull().default([]),
      riskLevel: riskLevel(),
      confidence: doublePrecision(),
      summary: text(),
      raw: jsonb(),
      error: text(),
      requestedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
      completedAt: timestamp({ withTimezone: true }),
      reviewedById: uuid().references(() => users.id),
      reviewDecision: aiReviewDecision(),
      reviewNotes: text(),
      reviewedAt: timestamp({ withTimezone: true }),
    },
    (t) => [index().on(t.caseId)],
  )
  .enableRLS();

// ---------------------------------------------------------------------------
// Advisories and notifications
// ---------------------------------------------------------------------------

export interface AdvisoryTranslation {
  title: string;
  body: string;
}

export const advisories = app
  .table(
    "advisories",
    {
      id: id(),
      title: text().notNull(),
      body: text().notNull(),
      /** `{ "hi": { title, body }, "gu": { title, body } }`. English lives in title/body. */
      translations: jsonb().$type<Record<string, AdvisoryTranslation>>().notNull().default({}),
      severity: advisorySeverity().notNull().default("info"),
      category: advisoryCategory().notNull().default("general"),
      /** Null = nationwide. */
      regionId: uuid().references(() => regions.id),
      diseaseCode: text().references(() => diseases.code),
      species: species().array(),
      publishedById: uuid()
        .notNull()
        .references(() => users.id),
      publishedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
      expiresAt: timestamp({ withTimezone: true }),
      createdAt: createdAt(),
      updatedAt: updatedAt(),
    },
    (t) => [index().on(t.regionId), index().on(t.publishedAt)],
  )
  .enableRLS();

export const notifications = app
  .table(
    "notifications",
    {
      id: id(),
      userId: uuid()
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
      type: notificationType().notNull(),
      title: text().notNull(),
      body: text().notNull(),
      /** Deep-link data for the client: `{ caseId }`, `{ labRequestId }`, … */
      data: jsonb().$type<Record<string, unknown>>().notNull().default({}),
      /** Stops scheduled jobs from sending the same reminder twice. */
      dedupeKey: text(),
      readAt: timestamp({ withTimezone: true }),
      createdAt: createdAt(),
    },
    (t) => [
      index().on(t.userId, t.createdAt),
      uniqueIndex("notifications_user_dedupe").on(t.userId, t.dedupeKey),
    ],
  )
  .enableRLS();
