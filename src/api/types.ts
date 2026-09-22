/**
 * Shapes of the PawVita API's JSON responses (server/src/routes). Timestamps
 * are ISO strings; calendar dates are `YYYY-MM-DD`.
 */

export type BackendRole = "farmer" | "field_worker" | "vet" | "ward_staff" | "lab_tech" | "official" | "admin";
export type AccountStatus = "pending" | "active" | "suspended";
export type RegionLevel = "country" | "state" | "district" | "block" | "village";
export type Species = "cattle" | "buffalo" | "goat" | "sheep" | "pig" | "poultry" | "horse" | "camel" | "other";
export type AnimalSex = "male" | "female" | "unknown";
export type AnimalStatus = "healthy" | "sick" | "under_treatment" | "recovering" | "dead" | "sold";
export type CaseStatus = "active" | "under_review" | "lab_pending" | "treated" | "resolved";
export type RiskLevel = "low" | "moderate" | "high";
export type CaseOutcome = "recovered" | "died" | "culled" | "false_alarm" | "other";
export type LabPriority = "routine" | "normal" | "high" | "urgent";
export type LabStatus = "requested" | "collected" | "received" | "processing" | "completed" | "rejected";
export type LabResult = "positive" | "negative" | "inconclusive";
export type VisitType = "investigation" | "follow_up" | "vaccination" | "other";
export type VisitStatus = "scheduled" | "in_progress" | "completed" | "cancelled";
export type AttachmentKind = "photo" | "voice" | "document" | "lab_report";
export type AdvisorySeverity = "info" | "low" | "moderate" | "high";
export type AdvisoryCategory = "outbreak" | "vaccination" | "weather" | "treatment" | "general";
export type OrganizationType = "hospital" | "lab" | "department" | "other";

export interface Page<T> {
  items: T[];
  limit: number;
  offset: number;
  hasMore: boolean;
}

// --- Auth & people -----------------------------------------------------------

export interface RegionPathItem {
  id: string;
  name: string;
  level: RegionLevel;
}

export interface RegionSummary {
  id: string;
  name: string;
  level: RegionLevel;
  /** State down to the region itself. */
  path: RegionPathItem[];
}

export interface Account {
  id: string;
  role: BackendRole;
  status: AccountStatus;
  fullName: string;
  phone: string | null;
  email: string | null;
  username: string | null;
  organizationId: string | null;
  regionId: string | null;
  preferredLanguage: string;
  hasLogin: boolean;
  createdAt: string;
  approvedAt: string | null;
  region: RegionSummary | null;
  organization: { id: string; name: string; code: string; type: OrganizationType } | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface SignInResult {
  session: AuthTokens;
  user: Account | null;
  registrationRequired: boolean;
}

/**
 * Staff sign-in may stop half-way: the password was right, but a code has been
 * emailed and must be posted back to /auth/login/verify before there is a
 * session. Accounts flagged two_factor_exempt (the demo logins) skip straight
 * to the signed-in branch.
 */
export interface TwoFactorChallenge {
  twoFactorRequired: true;
  /** Partly hidden, e.g. "me•••@pawvita.in" — enough to say where to look. */
  email: string;
}

export type LoginResult = ({ twoFactorRequired?: false } & SignInResult) | TwoFactorChallenge;

export interface Person {
  id: string;
  fullName: string;
  role: BackendRole;
  phone?: string | null;
}

// --- Reference data ----------------------------------------------------------

export interface Symptom {
  code: string;
  name: string;
  category: string;
  icon: string | null;
  translations: Record<string, string>;
  label: string;
}

export interface Disease {
  code: string;
  name: string;
  notifiable: boolean;
  species: Species[];
  translations: Record<string, string>;
  label: string;
}

export interface Vaccine {
  code: string;
  name: string;
  diseaseCodes: string[];
  species: Species[];
  boosterIntervalDays: number | null;
}

export interface Catalog {
  symptoms: Symptom[];
  diseases: Disease[];
  vaccines: Vaccine[];
}

export interface Region {
  id: string;
  name: string;
  level: RegionLevel;
  code: string | null;
  parentId: string | null;
  lat: number | null;
  lng: number | null;
}

export interface Organization {
  id: string;
  type: OrganizationType;
  name: string;
  code: string;
  regionId: string | null;
}

// --- Herds & animals -----------------------------------------------------------

export interface Animal {
  id: string;
  herdId: string;
  tagNumber: string | null;
  name: string | null;
  species: Species;
  breed: string | null;
  sex: AnimalSex;
  birthDate: string | null;
  status: AnimalStatus;
  diedAt: string | null;
  notes: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  /** Present in list responses. */
  herdName?: string;
  ownerId?: string;
}

export interface Herd {
  id: string;
  name: string;
  ownerId: string;
  regionId: string;
  lat: number | null;
  lng: number | null;
  address: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  owner: { id: string; fullName: string; phone: string | null; role: BackendRole } | null;
  region: RegionSummary | null;
  animalCount?: number;
  animals?: Animal[];
}

export interface VaccinationStatus {
  vaccineCode: string;
  vaccineName: string;
  administeredOn: string;
  nextDueOn: string | null;
  status: "complete" | "overdue" | "up_to_date";
}

export interface AnimalDetail extends Animal {
  herd: { id: string; name: string; regionId: string };
  owner: Person | null;
  region: RegionSummary | null;
  currentAdmission: (Admission & { organizationName: string }) | null;
  vaccinations: VaccinationStatus[];
  openCases: { id: string; caseNumber: string; status: CaseStatus; riskLevel: RiskLevel | null; createdAt: string }[];
}

export interface Vaccination {
  id: string;
  animalId: string;
  vaccineCode: string;
  administeredOn: string;
  nextDueOn: string | null;
  doseNumber: number | null;
  batchNumber: string | null;
  administeredById: string | null;
  recordedById: string;
  caseId: string | null;
  notes: string | null;
  createdAt: string;
  vaccineName?: string;
  animalName?: string | null;
}

export interface DueVaccination {
  animalId: string;
  vaccineCode: string;
  lastAdministeredOn: string;
  nextDueOn: string;
  vaccineName: string;
  animalName: string | null;
  tagNumber: string | null;
  species: Species;
  herdId: string;
  herdName: string;
  ownerName: string;
  ownerPhone: string | null;
  status: "overdue" | "upcoming";
}

export interface HistoryEntry {
  type: "case" | "treatment" | "vaccination" | "lab" | "mortality" | "admission";
  date: string;
  id: string;
  summary: string;
  data: Record<string, unknown>;
}

// --- Cases ---------------------------------------------------------------------

export interface CaseSummary {
  id: string;
  caseNumber: string;
  status: CaseStatus;
  riskLevel: RiskLevel | null;
  suspectedDiseaseCode: string | null;
  confirmedDiseaseCode: string | null;
  animalsAffected: number;
  animalsDead: number;
  symptomCodes: string[];
  herd: { id: string; name: string };
  owner: { id: string; fullName: string };
  animal: { id: string; name: string | null; tagNumber: string | null; species: Species } | null;
  assignedVet: { id: string; fullName: string } | null;
  location: { lat: number | null; lng: number | null };
  region: RegionSummary | null;
  capturedOffline: boolean;
  reportedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  kind: AttachmentKind;
  contentType: string;
  sizeBytes: number;
  originalName: string | null;
  caseId: string | null;
  labRequestId: string | null;
  animalId: string | null;
  uploadedById: string;
  createdAt: string;
  contentUrl: string;
  /** Short-lived link usable in <img src> without a token. */
  url?: string;
  urlExpiresAt?: string;
}

export interface TimelineEvent {
  id: string;
  type: string;
  fromStatus: CaseStatus | null;
  toStatus: CaseStatus | null;
  body: string | null;
  data: Record<string, unknown>;
  visibleToReporter: boolean;
  actor: { id: string; fullName: string | null; role: BackendRole | null } | null;
  createdAt: string;
}

export interface Treatment {
  id: string;
  caseId: string | null;
  animalId: string | null;
  medicine: string;
  dosage: string | null;
  route: string | null;
  frequency: string | null;
  durationDays: number | null;
  startDate: string;
  withdrawalPeriodDays: number | null;
  instructions: string | null;
  notes?: string | null;
  prescribedById: string;
  createdAt: string;
}

export interface LabRequest {
  id: string;
  requestNumber: string;
  caseId: string;
  animalId: string | null;
  requestedById: string;
  labOrgId: string | null;
  sampleType: string;
  tests: string[];
  priority: LabPriority;
  status: LabStatus;
  notes: string | null;
  collectedAt: string | null;
  receivedAt: string | null;
  processingStartedAt: string | null;
  completedAt: string | null;
  result: LabResult | null;
  resultDiseaseCode: string | null;
  resultSummary: string | null;
  resultDetails: string | null;
  rejectionReason: string | null;
  processedById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LabQueueItem extends LabRequest {
  caseNumber: string;
  suspectedDiseaseCode: string | null;
  animal: { id: string; name: string | null; species: Species | null; tagNumber: string | null } | null;
  requestedBy: { id: string; fullName: string };
  labName: string | null;
}

export interface LabRequestDetail extends LabRequest {
  case: { id: string; caseNumber: string; status: CaseStatus; suspectedDiseaseCode: string | null } | null;
  animal: { id: string; name: string | null; species: Species; tagNumber: string | null } | null;
  labName: string | null;
  requestedBy: Person | null;
  processedBy: Person | null;
  attachments: Attachment[];
  custody: { step: string; at: string | null }[];
}

export interface Visit {
  id: string;
  caseId: string | null;
  herdId: string;
  vetId: string;
  type: VisitType;
  status: VisitStatus;
  scheduledAt: string;
  purpose: string | null;
  notes: string | null;
  completedAt: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  herd: { id: string; name: string; lat: number | null; lng: number | null; address: string | null };
  vet: { id: string; fullName: string };
}

export interface AiAssessment {
  id: string;
  caseId: string;
  module: "vision" | "clinical" | "outbreak" | "combined";
  status: "pending" | "completed" | "failed";
  modelName: string | null;
  modelVersion: string | null;
  predictions: { label: string; confidence: number }[];
  riskLevel: RiskLevel | null;
  confidence: number | null;
  summary: string | null;
  reviewDecision: "accepted" | "rejected" | "modified" | null;
  requestedAt: string;
}

export interface CaseDetail {
  id: string;
  caseNumber: string;
  status: CaseStatus;
  riskLevel: RiskLevel | null;
  outcome: CaseOutcome | null;
  suspectedDisease: { code: string; name?: string; notifiable?: boolean } | null;
  confirmedDisease: { code: string; name?: string; notifiable?: boolean } | null;
  description: string | null;
  animalsAffected: number;
  animalsDead: number;
  onsetDate: string | null;
  priorTreatmentNotes: string | null;
  priorVaccinationNotes: string | null;
  location: { lat: number | null; lng: number | null; accuracyM: number | null };
  region: RegionSummary | null;
  capturedOffline: boolean;
  reportedAt: string;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  herd: { id: string; name: string; lat: number | null; lng: number | null; address: string | null } | null;
  owner: Person | null;
  reporter: Person | null;
  animal:
    | {
        id: string;
        name: string | null;
        tagNumber: string | null;
        species: Species;
        breed: string | null;
        sex: AnimalSex;
        birthDate: string | null;
        status: AnimalStatus;
        vaccinations: VaccinationStatus[];
      }
    | null;
  assignedVet: Person | null;
  assignedOrganization: { id: string; name: string; type: OrganizationType; phone: string | null } | null;
  symptoms: { code: string; name: string; category: string; icon: string | null; label: string }[];
  attachments: Attachment[];
  aiAssessments: AiAssessment[];
  treatments: Treatment[];
  labRequests: LabRequest[];
  visits: Omit<Visit, "herd" | "vet">[];
  timeline: TimelineEvent[];
  permissions: {
    changeStatus: boolean;
    updateAssessment: boolean;
    addTreatment: boolean;
    requestLab: boolean;
    reviewAi: boolean;
    assign: boolean;
    addNote: boolean;
    addAttachment: boolean;
  };
}

export interface Admission {
  id: string;
  animalId: string;
  organizationId: string;
  ward: string;
  reason: string | null;
  caseId: string | null;
  admittedAt: string;
  admittedById: string;
  dischargedAt: string | null;
  dischargedById: string | null;
  dischargeNotes: string | null;
}

export interface AdmissionListItem extends Admission {
  animal: {
    id: string;
    herdId: string;
    name: string | null;
    tagNumber: string | null;
    species: Species;
    breed: string | null;
    status: AnimalStatus;
  };
  owner: { fullName: string; phone: string | null; herdName: string };
  case: { id: string; caseNumber: string; status: CaseStatus; riskLevel: RiskLevel | null } | null;
}

// --- Advisories & notifications --------------------------------------------------

export interface Advisory {
  id: string;
  title: string;
  body: string;
  translations: Record<string, { title: string; body: string }>;
  severity: AdvisorySeverity;
  category: AdvisoryCategory;
  regionId: string | null;
  diseaseCode: string | null;
  species: Species[] | null;
  publishedById: string;
  publishedAt: string;
  expiresAt: string | null;
  localized: { language: string; title: string; body: string };
  region?: RegionSummary | null;
  publishedBy?: { id: string; fullName: string };
}

export interface AppNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

// --- Analytics & public ---------------------------------------------------------

export interface Scope {
  id: string;
  name: string;
  level: RegionLevel;
}

export interface AnalyticsOverview {
  scope: Scope | null;
  period: { from: string; to: string };
  cases: {
    reported: number;
    reportedOffline: number;
    resolved: number;
    open: number;
    openByStatus: Partial<Record<CaseStatus, number>>;
    openByRisk: Partial<Record<RiskLevel | "unassessed", number>>;
    openNotifiable: number;
  };
  responseTimeHours: { average: number | null; median: number | null };
  deaths: number;
  herds: number;
  animals: number;
  vaccination: { animals: number; upToDate: number; overdue: number; coveragePercent: number | null };
}

export interface RegionRollup {
  regionId: string;
  cases: number;
  open: number;
  highRiskOpen: number;
  animalsAffected: number;
  deaths: number;
  region: { id: string; name?: string; code?: string | null; lat?: number | null; lng?: number | null };
}

export interface TrendSeries {
  keys: string[];
  buckets: { start: string; total: number; counts: Record<string, number> }[];
}

export interface CoverageRow {
  regionId: string;
  animals: number;
  upToDate: number;
  overdue: number;
  neverVaccinated: number;
  coveragePercent: number | null;
  region: { id: string; name?: string };
}

export interface PublicStats {
  registeredFarmers: number;
  vetOfficers: number;
  activeCases: number;
  casesResolved: number;
  animalsMonitored: number;
  vaccinationCoveragePercent: number | null;
}

export interface PublicAlert {
  district: string;
  state: string | null;
  diseaseCode: string;
  diseaseName: string | null;
  cases: number;
  highRisk: number;
  latest: string;
  severity: "high" | "moderate" | "low";
}

export interface VetDirectoryEntry {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  organization: { id: string; name: string | null } | null;
  region: { id: string; name: string | null; level: RegionLevel | null } | null;
  openCases: number;
}

export interface AdminUser extends Omit<Account, "region" | "organization"> {
  region: RegionSummary | null;
}

export interface SystemHealth {
  services: {
    api: { status: string; uptimeSeconds: number };
    database: { status: string; latencyMs: number | null; driver: string; error?: string };
    storage: { status: string; latencyMs: number | null; provider: string; error?: string };
    auth: { status: string; provider: string };
    ai: { status: string; pending: number; failed: number };
  };
  queues: {
    pendingRegistrations: number;
    openCases: number;
    offlineSyncLast7Days: { count: number; avgDelayMinutes: number | null; maxDelayMinutes: number | null };
  };
  runtime: { node: string; environment: string; memoryMb: number; loadAverage: number[] };
}
