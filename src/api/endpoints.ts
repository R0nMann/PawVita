import { apiFetch, type QueryValue } from "./client";
import type {
  Account,
  AdminUser,
  AdmissionListItem,
  Advisory,
  AdvisoryCategory,
  AdvisorySeverity,
  AnalyticsOverview,
  Animal,
  AnimalDetail,
  AnimalSex,
  AppNotification,
  Attachment,
  AttachmentKind,
  AuthTokens,
  BackendRole,
  CaseDetail,
  CaseOutcome,
  CaseStatus,
  CaseSummary,
  Catalog,
  CoverageRow,
  DueVaccination,
  Herd,
  HistoryEntry,
  LabPriority,
  LabQueueItem,
  LabRequest,
  LabRequestDetail,
  LabResult,
  Organization,
  OrganizationType,
  Page,
  PublicAlert,
  PublicStats,
  Region,
  RegionLevel,
  RegionRollup,
  RegionSummary,
  RiskLevel,
  Scope,
  SignInResult,
  Species,
  SystemHealth,
  TimelineEvent,
  Treatment,
  TrendSeries,
  Vaccination,
  VetDirectoryEntry,
  Visit,
  VisitStatus,
  VisitType,
} from "./types";

type Query = Record<string, QueryValue>;

export const authApi = {
  requestOtp: (phone: string) =>
    apiFetch<{ sent: boolean; phone: string }>("/auth/otp/request", { body: { phone }, auth: false }),
  verifyOtp: (phone: string, otp: string) =>
    apiFetch<SignInResult>("/auth/otp/verify", { body: { phone, otp }, auth: false }),
  login: (identifier: string, password: string) =>
    apiFetch<SignInResult>("/auth/login", { body: { identifier, password }, auth: false }),
  registerPhone: (
    token: string,
    body: { fullName: string; role: BackendRole; regionId?: string; preferredLanguage: string; organizationCode?: string },
  ) => apiFetch<{ user: Account }>("/auth/register/phone", { body, token }),
  registerStaff: (body: {
    email: string;
    password: string;
    fullName: string;
    role: BackendRole;
    username?: string;
    phone?: string;
    organizationCode?: string;
    regionId?: string;
    preferredLanguage: string;
  }) =>
    apiFetch<{ user: Account; session: AuthTokens | null; emailConfirmationRequired: boolean }>("/auth/register/staff", {
      body,
      auth: false,
    }),
  logout: () => apiFetch<void>("/auth/logout", { method: "POST" }),
  me: (token?: string) =>
    apiFetch<{ user: Account | null; registrationRequired: boolean }>("/me", token ? { token } : {}),
  updateMe: (body: { fullName?: string; preferredLanguage?: string; regionId?: string }) =>
    apiFetch<{ user: Account }>("/me", { method: "PATCH", body }),
};

export const referenceApi = {
  catalog: (lang?: string) => apiFetch<Catalog>("/catalog", { query: { lang }, auth: false }),
  regions: (query: { parentId?: string; level?: RegionLevel; q?: string; limit?: number } = {}) =>
    apiFetch<{ items: Region[] }>("/regions", { query, auth: false }),
  region: (id: string) =>
    apiFetch<RegionSummary & { code: string | null; lat: number | null; lng: number | null; childCount: number }>(
      `/regions/${id}`,
      { auth: false },
    ),
  organizations: (query: { type?: OrganizationType; regionId?: string; q?: string } = {}) =>
    apiFetch<{ items: Organization[] }>("/organizations", { query, auth: false }),
};

export const publicApi = {
  stats: () => apiFetch<PublicStats>("/public/stats", { auth: false }),
  alerts: () => apiFetch<{ items: PublicAlert[] }>("/public/alerts", { auth: false }),
  trends: (months = 7) =>
    apiFetch<{ keys: string[]; buckets: { start: string; counts: Record<string, number> }[] }>("/public/trends", {
      query: { months },
      auth: false,
    }),
};

export interface NewAnimal {
  id?: string;
  herdId: string;
  tagNumber?: string;
  name?: string;
  species: Species;
  breed?: string;
  sex?: AnimalSex;
  birthDate?: string;
}

export const herdApi = {
  list: (query: Query = {}) => apiFetch<Page<Herd>>("/herds", { query }),
  get: (id: string) => apiFetch<Herd>(`/herds/${id}`),
  create: (body: {
    id?: string;
    name: string;
    regionId?: string;
    lat?: number;
    lng?: number;
    address?: string;
    ownerId?: string;
    owner?: { fullName: string; phone?: string; preferredLanguage?: string };
  }) => apiFetch<Herd>("/herds", { body }),
  animals: (query: Query = {}) => apiFetch<Page<Animal>>("/animals", { query }),
  animal: (id: string) => apiFetch<AnimalDetail>(`/animals/${id}`),
  lookup: (tag: string) =>
    apiFetch<Pick<Animal, "id" | "tagNumber" | "name" | "species" | "breed" | "status" | "herdId">>("/animals/lookup", {
      query: { tag },
    }),
  createAnimal: (body: NewAnimal) => apiFetch<AnimalDetail>("/animals", { body }),
  updateAnimal: (id: string, body: Partial<Omit<NewAnimal, "id">> & { status?: string }) =>
    apiFetch<AnimalDetail>(`/animals/${id}`, { method: "PATCH", body }),
  history: (id: string) => apiFetch<{ items: HistoryEntry[] }>(`/animals/${id}/history`),
  recordDeath: (body: { id?: string; herdId: string; animalId?: string; count?: number; diedOn: string; suspectedCause?: string }) =>
    apiFetch<unknown>("/mortality", { body }),
};

export interface NewVaccination {
  id?: string;
  animalId: string;
  vaccineCode: string;
  administeredOn: string;
  nextDueOn?: string | null;
  batchNumber?: string;
  caseId?: string;
  notes?: string;
}

export const vaccinationApi = {
  list: (query: Query = {}) => apiFetch<Page<Vaccination>>("/vaccinations", { query }),
  due: (query: Query = {}) => apiFetch<Page<DueVaccination>>("/vaccinations/due", { query }),
  record: (body: NewVaccination) => apiFetch<Vaccination>("/vaccinations", { body }),
  batch: (body: Omit<NewVaccination, "id" | "animalId"> & { animalIds: string[] }) =>
    apiFetch<{ items: Vaccination[]; count: number }>("/vaccinations/batch", { body }),
};

export interface NewCase {
  id?: string;
  herdId: string;
  animalId?: string;
  symptomCodes: string[];
  description?: string;
  animalsAffected?: number;
  animalsDead?: number;
  onsetDate?: string;
  location?: { lat: number; lng: number; accuracyM?: number };
  reportedAt?: string;
  capturedOffline?: boolean;
}

export const caseApi = {
  list: (query: Query = {}) => apiFetch<Page<CaseSummary>>("/cases", { query }),
  get: (id: string) => apiFetch<CaseDetail>(`/cases/${id}`),
  timeline: (id: string) => apiFetch<{ items: TimelineEvent[] }>(`/cases/${id}/timeline`),
  create: (body: NewCase) => apiFetch<CaseDetail>("/cases", { body }),
  setStatus: (id: string, body: { status: CaseStatus; note?: string; outcome?: CaseOutcome }) =>
    apiFetch<CaseDetail>(`/cases/${id}/status`, { method: "PATCH", body }),
  assess: (
    id: string,
    body: { riskLevel?: RiskLevel | null; suspectedDiseaseCode?: string | null; confirmedDiseaseCode?: string | null; note?: string },
  ) => apiFetch<CaseDetail>(`/cases/${id}/assessment`, { method: "PATCH", body }),
  assign: (id: string, body: { vetId?: string | null; organizationId?: string | null; note?: string }) =>
    apiFetch<CaseDetail>(`/cases/${id}/assign`, { body }),
  addNote: (id: string, body: { body: string; visibleToReporter?: boolean }) =>
    apiFetch<TimelineEvent>(`/cases/${id}/notes`, { body }),
  addTreatment: (
    id: string,
    body: {
      animalId?: string;
      medicine: string;
      dosage?: string;
      route?: string;
      frequency?: string;
      durationDays?: number;
      withdrawalPeriodDays?: number;
      instructions?: string;
      notes?: string;
    },
  ) => apiFetch<Treatment>(`/cases/${id}/treatments`, { body }),
  requestLab: (
    id: string,
    body: { labOrgId: string; sampleType: string; tests: string[]; priority?: LabPriority; notes?: string; animalId?: string },
  ) => apiFetch<LabRequest>(`/cases/${id}/lab-requests`, { body }),
};

export const labApi = {
  list: (query: Query = {}) => apiFetch<Page<LabQueueItem>>("/lab-requests", { query }),
  get: (id: string) => apiFetch<LabRequestDetail>(`/lab-requests/${id}`),
  setStatus: (id: string, body: { status: "collected" | "received" | "processing" | "rejected"; rejectionReason?: string }) =>
    apiFetch<LabRequest>(`/lab-requests/${id}/status`, { method: "PATCH", body }),
  result: (id: string, body: { result: LabResult; resultDiseaseCode?: string; summary: string; details?: string }) =>
    apiFetch<LabRequest>(`/lab-requests/${id}/result`, { body }),
};

export const visitApi = {
  list: (query: Query = {}) => apiFetch<Page<Visit>>("/visits", { query }),
  create: (body: { caseId?: string; herdId?: string; vetId?: string; type?: VisitType; scheduledAt: string; purpose?: string }) =>
    apiFetch<Visit>("/visits", { body }),
  update: (id: string, body: { status?: VisitStatus; scheduledAt?: string; notes?: string | null }) =>
    apiFetch<Visit>(`/visits/${id}`, { method: "PATCH", body }),
};

export const admissionApi = {
  list: (query: Query = {}) => apiFetch<Page<AdmissionListItem>>("/admissions", { query }),
  admit: (body: { animalId?: string; tagNumber?: string; ward: string; reason?: string; caseId?: string }) =>
    apiFetch<AdmissionListItem>("/admissions", { body }),
  move: (id: string, ward: string) => apiFetch<unknown>(`/admissions/${id}`, { method: "PATCH", body: { ward } }),
  discharge: (id: string, body: { notes?: string; animalStatus?: "healthy" | "recovering" | "under_treatment" }) =>
    apiFetch<unknown>(`/admissions/${id}/discharge`, { body }),
};

export const attachmentApi = {
  upload: (fields: { id?: string; kind: AttachmentKind; caseId?: string; labRequestId?: string; animalId?: string }, file: Blob, filename = "upload") => {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) if (value) form.set(key, value);
    form.set("file", file, filename);
    return apiFetch<Attachment>("/attachments", { form });
  },
};

export const advisoryApi = {
  list: (query: Query = {}) => apiFetch<Page<Advisory>>("/advisories", { query }),
  create: (body: {
    title: string;
    body: string;
    severity: AdvisorySeverity;
    category: AdvisoryCategory;
    regionId?: string | null;
    translations?: Record<string, { title: string; body: string }>;
  }) => apiFetch<Advisory>("/advisories", { body }),
};

export const notificationApi = {
  list: (query: Query = {}) =>
    apiFetch<Page<AppNotification> & { unreadCount: number }>("/notifications", { query }),
  read: (id: string) => apiFetch<AppNotification>(`/notifications/${id}/read`, { method: "POST" }),
  readAll: () => apiFetch<{ updated: number }>("/notifications/read-all", { method: "POST" }),
};

export const analyticsApi = {
  overview: (query: Query = {}) => apiFetch<AnalyticsOverview>("/analytics/overview", { query }),
  regions: (query: Query = {}) =>
    apiFetch<{ scope: Scope | null; level: RegionLevel; period: { from: string; to: string }; items: RegionRollup[] }>(
      "/analytics/regions",
      { query },
    ),
  trends: (query: Query = {}) =>
    apiFetch<TrendSeries & { interval: string; metric: string; groupBy: string; period: { from: string; to: string } }>(
      "/analytics/trends",
      { query },
    ),
  coverage: (query: Query = {}) =>
    apiFetch<{ scope: Scope | null; level: RegionLevel; items: CoverageRow[] }>("/analytics/vaccination-coverage", { query }),
  species: (query: Query = {}) =>
    apiFetch<{ items: { species: string; cases: number; animalsAffected: number }[] }>("/analytics/species", { query }),
};

export const directoryApi = {
  vets: (query: Query = {}) => apiFetch<{ items: VetDirectoryEntry[] }>("/directory/vets", { query }),
};

export const adminApi = {
  users: (query: Query = {}) => apiFetch<Page<AdminUser>>("/admin/users", { query }),
  createUser: (body: {
    fullName: string;
    role: BackendRole;
    email?: string;
    phone?: string;
    username?: string;
    password?: string;
    organizationId?: string;
    regionId?: string;
  }) => apiFetch<{ user: Account }>("/admin/users", { body }),
  updateUser: (id: string, body: { status?: string; role?: BackendRole; regionId?: string | null; organizationId?: string | null }) =>
    apiFetch<{ user: Account }>(`/admin/users/${id}`, { method: "PATCH", body }),
  approve: (id: string, body: { regionId?: string; organizationId?: string } = {}) =>
    apiFetch<{ user: Account }>(`/admin/users/${id}/approve`, { body }),
  createRegion: (body: { name: string; level: RegionLevel; parentId?: string | null; code?: string; lat?: number; lng?: number }) =>
    apiFetch<Region>("/admin/regions", { body }),
  importRegions: (regions: { code: string; name: string; level: RegionLevel; parentCode?: string; lat?: number; lng?: number }[]) =>
    apiFetch<{ created: number; updated: number }>("/admin/regions/import", { body: { regions } }),
  systemHealth: () => apiFetch<SystemHealth>("/admin/system-health"),
};
