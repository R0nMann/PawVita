import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { aiAssessments } from "../src/db/schema.js";
import { createTestContext, type TestContext, type TestUser } from "./helpers.js";

/**
 * End-to-end smoke test: every route registered in src/app.ts is called once
 * on its happy path, by a user with the role it is meant for. It answers
 * "is every endpoint wired up and working?" rather than testing edge cases —
 * those live in the per-area test files.
 */

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

/** Every `METHOD /path` that answered, so the suite can prove nothing was missed. */
const called = new Set<string>();

let ctx: TestContext;
let regions: Awaited<ReturnType<TestContext["createRegions"]>>;
let hospital: { id: string; code: string };
let lab: { id: string };
let admin: TestUser;
let official: TestUser;
let vet: TestUser;
let otherVet: TestUser;
let wardStaff: TestUser;
let labTech: TestUser;
let farmer: TestUser;

/** Call an endpoint, record it, and fail loudly with the server's message. */
async function call(
  method: "get" | "post" | "patch" | "delete",
  route: string,
  opts: { as?: TestUser; path?: string; body?: unknown; query?: string; expect?: number } = {},
) {
  const url = `/api/v1${opts.path ?? route}${opts.query ?? ""}`;
  let req = ctx.request[method](url);
  if (opts.as) req = req.set(opts.as.auth);
  if (opts.body !== undefined) req = req.send(opts.body as object);
  const res = await req;
  const want = opts.expect ?? (method === "post" ? 201 : 200);
  if (res.status !== want) {
    throw new Error(`${method.toUpperCase()} ${url} → ${res.status} (expected ${want}): ${JSON.stringify(res.body)}`);
  }
  called.add(`${method.toUpperCase()} ${route}`);
  return res;
}

beforeAll(async () => {
  ctx = await createTestContext();
  regions = await ctx.createRegions();
  const hospitalOrg = await ctx.createOrganization("hospital", "vh-anand", regions.anand.id);
  const labOrg = await ctx.createOrganization("lab", "lab-anand", regions.anand.id);
  hospital = { id: hospitalOrg.id, code: hospitalOrg.code! };
  lab = { id: labOrg.id };

  admin = await ctx.createUser("admin");
  official = await ctx.createUser("official", { regionId: regions.state.id });
  vet = await ctx.createUser("vet", { regionId: regions.anand.id, organizationId: hospital.id, fullName: "Dr. Meera Patel" });
  otherVet = await ctx.createUser("vet", { regionId: regions.anand.id, fullName: "Dr. Anil Singh" });
  wardStaff = await ctx.createUser("ward_staff", { regionId: regions.anand.id, organizationId: hospital.id });
  labTech = await ctx.createUser("lab_tech", { regionId: regions.anand.id, organizationId: lab.id });
  farmer = await ctx.createUser("farmer", { regionId: regions.vadod.id, fullName: "Ramesh Kumar" });
}, 90_000);

afterAll(() => ctx.close());

describe("health", () => {
  it("answers the liveness and readiness probes", async () => {
    await ctx.request.get("/health").expect(200, { status: "ok" });
    await ctx.request.get("/health/ready").expect(200, { status: "ready" });
  });
});

describe("auth", () => {
  it("runs the registration, password, refresh and logout flows", async () => {
    // A farmer registers themselves and is active straight away.
    const registered = await call("post", "/auth/register", {
      body: {
        fullName: "Sunita Devi",
        email: "sunita.devi@test.pawvita.in",
        password: "correct-horse-battery",
        phone: "9876590001",
        regionId: regions.kheda.id,
        preferredLanguage: "gu",
      },
    });
    expect(registered.body.user).toMatchObject({ role: "farmer", status: "active", phone: "+919876590001" });

    // The same endpoint leaves staff pending until an admin approves them.
    const staff = await call("post", "/auth/register", {
      body: {
        email: "new.vet@test.pawvita.in",
        password: "correct-horse-battery",
        fullName: "Dr. Priya Shah",
        role: "vet",
        username: "dr.priya",
        organizationCode: hospital.code,
        regionId: regions.anand.id,
      },
    });
    expect(staff.body.user.status).toBe("pending");

    const login = await call("post", "/auth/login", {
      body: { identifier: "new.vet@test.pawvita.in", password: "correct-horse-battery" },
      expect: 200,
    });
    const refreshed = await call("post", "/auth/refresh", {
      body: { refreshToken: login.body.session.refreshToken },
      expect: 200,
    });
    expect(refreshed.body.session.accessToken).toBeTruthy();
    await call("post", "/auth/logout", {
      as: { id: "", token: "", auth: { Authorization: `Bearer ${refreshed.body.session.accessToken}` } },
      expect: 204,
    });

    // Admin approval endpoints, on that same pending account.
    const pending = await call("get", "/admin/users", { as: admin, query: "?status=pending" });
    const pendingId = pending.body.items.find((u: { email: string }) => u.email === "new.vet@test.pawvita.in").id;
    const approved = await call("post", "/admin/users/:id/approve", {
      as: admin,
      path: `/admin/users/${pendingId}/approve`,
      body: { regionId: regions.anand.id, organizationId: hospital.id },
      expect: 200,
    });
    expect(approved.body.user.status).toBe("active");
  });

  it("serves and updates the signed-in account", async () => {
    const me = await call("get", "/me", { as: farmer });
    expect(me.body.user).toMatchObject({ role: "farmer", fullName: "Ramesh Kumar" });
    const updated = await call("patch", "/me", {
      as: farmer,
      body: { preferredLanguage: "hi", regionId: regions.vadod.id },
      expect: 200,
    });
    expect(updated.body.user.preferredLanguage).toBe("hi");
  });
});

describe("reference and public data", () => {
  it("serves the catalogue, regions and organisations without a session", async () => {
    const catalog = await call("get", "/catalog", { query: "?lang=hi" });
    expect(catalog.body.symptoms.length).toBeGreaterThan(0);
    expect(catalog.body.diseases.length).toBeGreaterThan(0);
    const list = await call("get", "/regions", { query: `?parentId=${regions.state.id}` });
    expect(list.body.items.length).toBeGreaterThan(0);
    const one = await call("get", "/regions/:id", { path: `/regions/${regions.anand.id}` });
    expect(one.body).toMatchObject({ name: "Anand", level: "district" });
    const orgs = await call("get", "/organizations", { query: "?type=hospital" });
    expect(orgs.body.items.length).toBeGreaterThan(0);
  });

  it("serves the public landing-page aggregates", async () => {
    await call("get", "/public/stats");
    await call("get", "/public/alerts");
    await call("get", "/public/trends", { query: "?months=3" });
    await call("get", "/public/advisories", { query: `?regionId=${regions.anand.id}&lang=hi` });
  });
});

describe("herds, animals and mortality", () => {
  it("registers, reads and edits a herd and its animals", async () => {
    const herd = await call("post", "/herds", {
      as: farmer,
      body: { name: "Ramesh's herd", regionId: regions.vadod.id, lat: 22.56, lng: 72.95, address: "Vadod" },
    });
    const animal = await call("post", "/animals", {
      as: farmer,
      body: { herdId: herd.body.id, name: "Gauri", species: "cattle", sex: "female", tagNumber: "TAG-SMOKE-1" },
    });

    await call("get", "/herds", { as: farmer, query: "?q=Ramesh" });
    await call("get", "/herds/:id", { as: farmer, path: `/herds/${herd.body.id}` });
    await call("patch", "/herds/:id", {
      as: farmer,
      path: `/herds/${herd.body.id}`,
      body: { address: "Vadod, Anand" },
      expect: 200,
    });

    await call("get", "/animals", { as: farmer, query: `?herdId=${herd.body.id}` });
    await call("get", "/animals/:id", { as: farmer, path: `/animals/${animal.body.id}` });
    await call("patch", "/animals/:id", {
      as: farmer,
      path: `/animals/${animal.body.id}`,
      body: { breed: "Gir" },
      expect: 200,
    });
    await call("get", "/animals/:id/history", { as: farmer, path: `/animals/${animal.body.id}/history` });
    const lookup = await call("get", "/animals/lookup", { as: vet, query: "?tag=TAG-SMOKE-1" });
    expect(lookup.body.id).toBe(animal.body.id);

    // A second animal, so a death does not empty the herd.
    const second = await call("post", "/animals", {
      as: farmer,
      body: { herdId: herd.body.id, name: "Kali", species: "cattle", tagNumber: "TAG-SMOKE-2" },
    });
    const death = await call("post", "/mortality", {
      as: farmer,
      body: { herdId: herd.body.id, animalId: second.body.id, diedOn: new Date().toISOString().slice(0, 10), suspectedCause: "Unknown" },
    });
    expect(death.body.count).toBe(1);
    await call("get", "/mortality", { as: vet, query: `?herdId=${herd.body.id}` });
  });
});

describe("vaccinations", () => {
  it("records one and a batch, and lists history and what is due", async () => {
    const { herdId, animalId } = await ctx.createHerdWithAnimal(farmer, regions.vadod.id);
    const second = await ctx.request
      .post("/api/v1/animals")
      .set(farmer.auth)
      .send({ herdId, name: "Nandi", species: "cattle", tagNumber: `TAG-${randomUUID().slice(0, 8)}` })
      .expect(201);

    await call("post", "/vaccinations", {
      as: vet,
      body: { animalId, vaccineCode: "fmd", administeredOn: new Date().toISOString().slice(0, 10), doseNumber: 1, batchNumber: "B-1" },
    });
    const batch = await call("post", "/vaccinations/batch", {
      as: vet,
      body: { animalIds: [animalId, second.body.id], vaccineCode: "hs_bq", administeredOn: new Date().toISOString().slice(0, 10) },
    });
    expect(batch.body.count).toBe(2);

    const history = await call("get", "/vaccinations", { as: farmer, query: `?herdId=${herdId}` });
    expect(history.body.items.length).toBeGreaterThanOrEqual(3);
    await call("get", "/vaccinations/due", { as: vet, query: "?withinDays=365&includeOverdue=true" });
  });
});

describe("the clinical path: case → treatment → lab → visit → admission → resolution", () => {
  let herdId: string;
  let animalId: string;
  let caseId: string;
  let labRequestId: string;

  it("reports a case and lists the queue", async () => {
    const herd = await ctx.createHerdWithAnimal(farmer, regions.vadod.id);
    herdId = herd.herdId;
    animalId = herd.animalId;
    const reported = await call("post", "/cases", {
      as: farmer,
      body: {
        herdId,
        animalId,
        symptomCodes: ["fever", "mouth_sores", "drooling"],
        description: "Not eating since yesterday.",
        animalsAffected: 3,
        animalsDead: 0,
        capturedOffline: true,
        location: { lat: 22.56, lng: 72.95, accuracyM: 12 },
      },
    });
    caseId = reported.body.id;
    expect(reported.body.caseNumber).toMatch(/^PV-\d{4}-\d{6}$/);

    await call("get", "/cases", { as: vet, query: "?open=true&sort=priority" });
    await call("get", "/cases/:id", { as: vet, path: `/cases/${caseId}` });
    await call("get", "/cases/:id/timeline", { as: farmer, path: `/cases/${caseId}/timeline` });
  });

  it("assigns, assesses, advises and treats", async () => {
    await call("post", "/cases/:id/assign", {
      as: official,
      path: `/cases/${caseId}/assign`,
      body: { vetId: vet.id, organizationId: hospital.id, note: "Nearest vet." },
      expect: 200,
    });
    const assessed = await call("patch", "/cases/:id/assessment", {
      as: vet,
      path: `/cases/${caseId}/assessment`,
      body: { riskLevel: "high", suspectedDiseaseCode: "fmd", note: "Classic presentation." },
      expect: 200,
    });
    expect(assessed.body).toMatchObject({ riskLevel: "high", suspectedDisease: { code: "fmd" } });

    await call("post", "/cases/:id/notes", {
      as: vet,
      path: `/cases/${caseId}/notes`,
      body: { body: "Isolate the animal and keep it in shade.", visibleToReporter: true },
    });
    await call("post", "/cases/:id/treatments", {
      as: vet,
      path: `/cases/${caseId}/treatments`,
      body: {
        animalId,
        medicine: "Oxytetracycline",
        dosage: "10 mg/kg",
        route: "IM",
        frequency: "once daily",
        durationDays: 3,
        withdrawalPeriodDays: 7,
        instructions: "Do not sell the milk.",
      },
    });
  });

  it("uploads evidence and serves it back", async () => {
    const upload = await ctx.request
      .post("/api/v1/attachments")
      .set(farmer.auth)
      .field("kind", "photo")
      .field("caseId", caseId)
      .attach("file", PNG, { filename: "lesion.png" })
      .expect(201);
    called.add("POST /attachments");
    await call("get", "/attachments/:id", { as: vet, path: `/attachments/${upload.body.id}` });
    const redirect = await call("get", "/attachments/:id/content", {
      as: vet,
      path: `/attachments/${upload.body.id}/content`,
      expect: 302,
    });
    // The signed link is served by /files/:key, outside the authenticated routes.
    const file = await ctx.request.get(redirect.headers.location!).expect(200);
    expect(file.headers["content-type"]).toBe("image/png");
    called.add("GET /files/:key");
  });

  it("runs a sample through the laboratory", async () => {
    const requested = await call("post", "/cases/:id/lab-requests", {
      as: vet,
      path: `/cases/${caseId}/lab-requests`,
      body: { animalId, labOrgId: lab.id, sampleType: "Tongue epithelium", tests: ["FMD antigen ELISA"], priority: "urgent" },
    });
    labRequestId = requested.body.id;

    await call("get", "/lab-requests", { as: labTech, query: "?sort=priority" });
    await call("get", "/lab-requests/:id", { as: labTech, path: `/lab-requests/${labRequestId}` });
    await call("patch", "/lab-requests/:id/status", {
      as: labTech,
      path: `/lab-requests/${labRequestId}/status`,
      body: { status: "received" },
      expect: 200,
    });
    const result = await call("post", "/lab-requests/:id/result", {
      as: labTech,
      path: `/lab-requests/${labRequestId}/result`,
      body: { result: "positive", resultDiseaseCode: "fmd", summary: "FMD antigen detected.", details: "Serotype O." },
      expect: 200,
    });
    expect(result.body).toMatchObject({ status: "completed", result: "positive" });
  });

  it("schedules a field visit", async () => {
    const visit = await call("post", "/visits", {
      as: vet,
      body: {
        caseId,
        type: "follow_up",
        scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
        purpose: "Check response to treatment",
      },
    });
    await call("get", "/visits", { as: vet, query: "?mine=true" });
    await call("patch", "/visits/:id", {
      as: vet,
      path: `/visits/${visit.body.id}`,
      body: { status: "completed", notes: "Lesions healing." },
      expect: 200,
    });
  });

  it("admits the animal to a ward and discharges it", async () => {
    const admission = await call("post", "/admissions", {
      as: wardStaff,
      body: { animalId, ward: "Isolation A", reason: "FMD observation", caseId },
    });
    await call("get", "/admissions", { as: wardStaff, query: "?active=true" });
    await call("patch", "/admissions/:id", {
      as: wardStaff,
      path: `/admissions/${admission.body.id}`,
      body: { ward: "Isolation B" },
      expect: 200,
    });
    await call("post", "/admissions/:id/discharge", {
      as: wardStaff,
      path: `/admissions/${admission.body.id}/discharge`,
      body: { notes: "Recovered.", animalStatus: "recovering" },
      expect: 200,
    });
  });

  it("reviews an AI assessment and resolves the case", async () => {
    // The AI layer is a no-op until configured, so stand in for it with the
    // completed assessment it would have written.
    const [assessment] = await ctx.deps.db
      .insert(aiAssessments)
      .values({
        caseId,
        module: "combined",
        status: "completed",
        modelName: "smoke-test",
        riskLevel: "high",
        confidence: 0.82,
        summary: "Vesicular lesions consistent with FMD.",
        predictions: [{ label: "Foot and mouth disease", confidence: 0.82 }],
        completedAt: new Date(),
      })
      .returning();
    const reviewed = await call("post", "/cases/:id/ai-assessments/:assessmentId/review", {
      as: vet,
      path: `/cases/${caseId}/ai-assessments/${assessment!.id}/review`,
      body: { decision: "accepted", notes: "Matches my findings." },
      expect: 200,
    });
    expect(reviewed.body).toMatchObject({ reviewDecision: "accepted", reviewedById: vet.id });

    const resolved = await call("patch", "/cases/:id/status", {
      as: vet,
      path: `/cases/${caseId}/status`,
      body: { status: "resolved", outcome: "recovered", note: "Animal recovered." },
      expect: 200,
    });
    expect(resolved.body.status).toBe("resolved");
  });
});

describe("advisories, notifications and the directory", () => {
  it("publishes, edits, lists and withdraws an advisory", async () => {
    const created = await call("post", "/advisories", {
      as: official,
      body: {
        title: "FMD vaccination drive",
        body: "Bring your cattle to the village centre on Sunday.",
        translations: { hi: { title: "एफएमडी टीकाकरण", body: "रविवार को पशु लाएँ।" } },
        severity: "moderate",
        category: "vaccination",
        regionId: regions.anand.id,
        diseaseCode: "fmd",
        species: ["cattle", "buffalo"],
        expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      },
    });
    await call("get", "/advisories", { as: farmer, query: "?lang=hi" });
    await call("patch", "/advisories/:id", {
      as: official,
      path: `/advisories/${created.body.id}`,
      body: { severity: "high" },
      expect: 200,
    });
    await call("delete", "/advisories/:id", { as: official, path: `/advisories/${created.body.id}`, expect: 204 });
  });

  it("lists notifications and marks them read", async () => {
    const list = await call("get", "/notifications", { as: vet });
    expect(list.body.items.length).toBeGreaterThan(0);
    await call("post", "/notifications/:id/read", {
      as: vet,
      path: `/notifications/${list.body.items[0].id}/read`,
      expect: 200,
    });
    const all = await call("post", "/notifications/read-all", { as: vet, expect: 200 });
    expect(all.body.updated).toBeGreaterThanOrEqual(0);
  });

  it("lists the vets on call", async () => {
    const vets = await call("get", "/directory/vets", { as: wardStaff });
    expect(vets.body.items.map((v: { id: string }) => v.id)).toContain(otherVet.id);
  });
});

describe("analytics", () => {
  it("serves every surveillance view", async () => {
    await call("get", "/analytics/overview", { as: official });
    await call("get", "/analytics/regions", { as: official, query: "?diseaseCode=fmd" });
    await call("get", "/analytics/trends", { as: official, query: "?interval=week&groupBy=disease" });
    await call("get", "/analytics/vaccination-coverage", { as: official, query: "?vaccineCode=fmd" });
    await call("get", "/analytics/species", { as: official });
  });
});

describe("administration", () => {
  it("manages users, organisations and regions, and runs operations", async () => {
    const created = await call("post", "/admin/users", {
      as: admin,
      body: {
        fullName: "Kiran Patel",
        role: "field_worker",
        email: "kiran.patel@test.pawvita.in",
        password: "correct-horse-battery",
        regionId: regions.anandBlock.id,
      },
    });
    await call("patch", "/admin/users/:id", {
      as: admin,
      path: `/admin/users/${created.body.user.id}`,
      body: { preferredLanguage: "gu" },
      expect: 200,
    });

    const org = await call("post", "/admin/organizations", {
      as: admin,
      body: { type: "lab", name: "Kutch District Laboratory", code: "LAB-KUTCH", regionId: regions.kutch.id },
    });
    await call("patch", "/admin/organizations/:id", {
      as: admin,
      path: `/admin/organizations/${org.body.id}`,
      body: { phone: "+919876500999" },
      expect: 200,
    });

    const region = await call("post", "/admin/regions", {
      as: admin,
      body: { name: "Borsad", level: "block", parentId: regions.anand.id, code: "T-BORSAD" },
    });
    await call("patch", "/admin/regions/:id", {
      as: admin,
      path: `/admin/regions/${region.body.id}`,
      body: { lat: 22.41, lng: 72.9 },
      expect: 200,
    });
    const imported = await call("post", "/admin/regions/import", {
      as: admin,
      body: {
        regions: [
          { code: "T-BORSAD", name: "Borsad", level: "block", parentCode: "T-ANAND" },
          { code: "T-BORSAD-V1", name: "Kasumbad", level: "village", parentCode: "T-BORSAD" },
        ],
      },
      expect: 200,
    });
    expect(imported.body).toMatchObject({ created: 1, updated: 1 });

    const health = await call("get", "/admin/system-health", { as: admin });
    expect(health.body.services.database.status).toBe("operational");
    expect(health.body.services.storage.status).toBe("operational");
    await call("post", "/admin/jobs/reminders", { as: admin, expect: 200 });
  });
});

describe("coverage", () => {
  it("called every endpoint the API registers", () => {
    const expected = [
      "POST /auth/login",
      "POST /auth/refresh",
      "POST /auth/logout",
      "POST /auth/register",
      "GET /me",
      "PATCH /me",
      "GET /catalog",
      "GET /regions",
      "GET /regions/:id",
      "GET /organizations",
      "GET /public/stats",
      "GET /public/alerts",
      "GET /public/trends",
      "GET /public/advisories",
      "GET /files/:key",
      "GET /herds",
      "POST /herds",
      "GET /herds/:id",
      "PATCH /herds/:id",
      "GET /animals",
      "GET /animals/lookup",
      "POST /animals",
      "GET /animals/:id",
      "PATCH /animals/:id",
      "GET /animals/:id/history",
      "POST /mortality",
      "GET /mortality",
      "POST /vaccinations",
      "POST /vaccinations/batch",
      "GET /vaccinations",
      "GET /vaccinations/due",
      "POST /cases",
      "GET /cases",
      "GET /cases/:id",
      "GET /cases/:id/timeline",
      "PATCH /cases/:id/status",
      "PATCH /cases/:id/assessment",
      "POST /cases/:id/assign",
      "POST /cases/:id/notes",
      "POST /cases/:id/treatments",
      "POST /cases/:id/lab-requests",
      "POST /cases/:id/ai-assessments/:assessmentId/review",
      "GET /lab-requests",
      "GET /lab-requests/:id",
      "PATCH /lab-requests/:id/status",
      "POST /lab-requests/:id/result",
      "GET /visits",
      "POST /visits",
      "PATCH /visits/:id",
      "GET /admissions",
      "POST /admissions",
      "PATCH /admissions/:id",
      "POST /admissions/:id/discharge",
      "POST /attachments",
      "GET /attachments/:id",
      "GET /attachments/:id/content",
      "GET /advisories",
      "POST /advisories",
      "PATCH /advisories/:id",
      "DELETE /advisories/:id",
      "GET /notifications",
      "POST /notifications/read-all",
      "POST /notifications/:id/read",
      "GET /analytics/overview",
      "GET /analytics/regions",
      "GET /analytics/trends",
      "GET /analytics/vaccination-coverage",
      "GET /analytics/species",
      "GET /directory/vets",
      "GET /admin/users",
      "POST /admin/users",
      "PATCH /admin/users/:id",
      "POST /admin/users/:id/approve",
      "POST /admin/organizations",
      "PATCH /admin/organizations/:id",
      "POST /admin/regions",
      "PATCH /admin/regions/:id",
      "POST /admin/regions/import",
      "GET /admin/system-health",
      "POST /admin/jobs/reminders",
    ];
    expect([...expected].filter((e) => !called.has(e))).toEqual([]);
  });
});
