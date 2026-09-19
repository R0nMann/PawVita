import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestContext, OTP, type TestContext, type TestUser } from "./helpers.js";

let ctx: TestContext;
let r: Awaited<ReturnType<TestContext["createRegions"]>>;
let farmer: TestUser;
let otherFarmer: TestUser;
let vet: TestUser;
let kutchVet: TestUser;
let labTech: TestUser;
let official: TestUser;
let kutchOfficial: TestUser;
let labOrgId: string;
let herdId: string;
let animalId: string;

beforeAll(async () => {
  ctx = await createTestContext();
  r = await ctx.createRegions();
  const lab = await ctx.createOrganization("lab", "lab-anand", r.anand.id);
  labOrgId = lab.id;
  farmer = await ctx.createUser("farmer", { regionId: r.vadod.id, fullName: "Ramesh Kumar" });
  otherFarmer = await ctx.createUser("farmer", { regionId: r.kheda.id });
  vet = await ctx.createUser("vet", { regionId: r.anand.id, fullName: "Dr. Meera Patel" });
  kutchVet = await ctx.createUser("vet", { regionId: r.kutch.id });
  labTech = await ctx.createUser("lab_tech", { organizationId: lab.id });
  official = await ctx.createUser("official", { regionId: r.state.id });
  kutchOfficial = await ctx.createUser("official", { regionId: r.kutch.id });
  ({ herdId, animalId } = await ctx.createHerdWithAnimal(farmer, r.vadod.id));
});
afterAll(() => ctx.close());

const api = (path: string) => `/api/v1${path}`;

describe("reporting a case", () => {
  let caseId: string;

  it("stores the report, marks the animal sick and alerts vets covering the area", async () => {
    const id = randomUUID();
    const res = await ctx.request
      .post(api("/cases"))
      .set(farmer.auth)
      .send({
        id,
        herdId,
        animalId,
        symptomCodes: ["blisters", "drooling", "lameness"],
        description: "Blisters on the mouth since yesterday, not eating.",
        animalsAffected: 2,
        location: { lat: 22.53, lng: 72.99, accuracyM: 12 },
        capturedOffline: true,
        reportedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      })
      .expect(201);
    caseId = res.body.id;
    expect(caseId).toBe(id);
    expect(res.body).toMatchObject({ status: "active", riskLevel: null, animalsAffected: 2, capturedOffline: true });
    expect(res.body.caseNumber).toMatch(/^PV-\d{4}-\d{6}$/);
    expect(res.body.symptoms.map((s: { code: string }) => s.code).sort()).toEqual(["blisters", "drooling", "lameness"]);
    expect(res.body.region.name).toBe("Vadod");
    expect(res.body.animal.status).toBe("sick");
    expect(res.body.permissions.changeStatus).toBe(false);

    const vetInbox = await ctx.request.get(api("/notifications")).set(vet.auth).expect(200);
    expect(vetInbox.body.items[0]).toMatchObject({ type: "case_reported", data: { caseId } });
    const otherInbox = await ctx.request.get(api("/notifications")).set(kutchVet.auth).expect(200);
    expect(otherInbox.body.unreadCount).toBe(0);
  });

  it("is idempotent when an offline client replays the same report", async () => {
    const replay = await ctx.request
      .post(api("/cases"))
      .set(farmer.auth)
      .send({ id: caseId, herdId, symptomCodes: ["fever"] })
      .expect(200);
    expect(replay.body.id).toBe(caseId);
    const list = await ctx.request.get(api("/cases")).set(farmer.auth).expect(200);
    expect(list.body.items.filter((c: { id: string }) => c.id === caseId)).toHaveLength(1);
    // Someone else cannot claim the id.
    const { herdId: otherHerd } = await ctx.createHerdWithAnimal(otherFarmer, r.kheda.id);
    await ctx.request.post(api("/cases")).set(otherFarmer.auth).send({ id: caseId, herdId: otherHerd, symptomCodes: ["fever"] }).expect(409);
  });

  it("validates input", async () => {
    const empty = await ctx.request.post(api("/cases")).set(farmer.auth).send({ herdId }).expect(400);
    expect(empty.body.error.details[0].path).toBe("symptomCodes");
    const unknown = await ctx.request.post(api("/cases")).set(farmer.auth).send({ herdId, symptomCodes: ["telepathy"] }).expect(400);
    expect(unknown.body.error.details.symptomCodes).toEqual(["telepathy"]);
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await ctx.request.post(api("/cases")).set(farmer.auth).send({ herdId, symptomCodes: ["fever"], reportedAt: future }).expect(400);
  });

  it("hides cases from people outside them", async () => {
    await ctx.request.get(api(`/cases/${caseId}`)).set(otherFarmer.auth).expect(404);
    await ctx.request.get(api(`/cases/${caseId}`)).set(kutchVet.auth).expect(404);
    await ctx.request.get(api(`/cases/${caseId}`)).set(kutchOfficial.auth).expect(404);
    await ctx.request.get(api(`/cases/${caseId}`)).set(official.auth).expect(200);
    await ctx.request.get(api(`/cases/${caseId}`)).set(labTech.auth).expect(404);
    // Another farmer cannot report on this herd either.
    await ctx.request.post(api("/cases")).set(otherFarmer.auth).send({ herdId, symptomCodes: ["fever"] }).expect(404);
  });

  it("walks the full veterinary workflow", async () => {
    // Queue: the new case is in the vet's priority list.
    const queue = await ctx.request.get(api("/cases?open=true&sort=priority")).set(vet.auth).expect(200);
    expect(queue.body.items.map((c: { id: string }) => c.id)).toContain(caseId);

    // Assessment: first vet action moves the case under review.
    const assessed = await ctx.request
      .patch(api(`/cases/${caseId}/assessment`))
      .set(vet.auth)
      .send({ riskLevel: "high", suspectedDiseaseCode: "fmd", note: "Classic vesicular lesions." })
      .expect(200);
    expect(assessed.body).toMatchObject({ status: "under_review", riskLevel: "high", suspectedDisease: { code: "fmd", notifiable: true } });
    expect(assessed.body.firstResponseAt).toBeTruthy();
    const assessmentEvents = (body: { timeline: { type: string; body: string }[] }) =>
      body.timeline.filter((e) => e.type === "assessment_updated");
    // Names, not codes; untouched fields are not mentioned.
    expect(assessmentEvents(assessed.body)[0]!.body).toBe(
      "Risk level: High — urgent attention. Suspected disease: Foot-and-Mouth Disease. Classic vesicular lesions.",
    );
    const unchanged = await ctx.request
      .patch(api(`/cases/${caseId}/assessment`))
      .set(vet.auth)
      .send({ riskLevel: "high", suspectedDiseaseCode: "fmd", confirmedDiseaseCode: null })
      .expect(200);
    expect(assessmentEvents(unchanged.body)).toHaveLength(1);

    // Farmers cannot take clinical actions.
    await ctx.request.patch(api(`/cases/${caseId}/status`)).set(farmer.auth).send({ status: "resolved", outcome: "recovered" }).expect(403);

    // Internal note vs advice.
    await ctx.request.post(api(`/cases/${caseId}/notes`)).set(vet.auth).send({ body: "Check neighbouring herds." }).expect(201);
    await ctx.request
      .post(api(`/cases/${caseId}/notes`))
      .set(vet.auth)
      .send({ body: "Isolate the animal and do not move livestock.", visibleToReporter: true })
      .expect(201);

    // Treatment moves it to treated and tells the farmer about milk withdrawal.
    const treatment = await ctx.request
      .post(api(`/cases/${caseId}/treatments`))
      .set(vet.auth)
      .send({ medicine: "Oxytetracycline", dosage: "10 mg/kg", durationDays: 5, withdrawalPeriodDays: 7, instructions: "Wash lesions with potassium permanganate.", notes: "Internal: monitor temperature." })
      .expect(201);
    expect(treatment.body.animalId).toBe(animalId);
    let detail = await ctx.request.get(api(`/cases/${caseId}`)).set(vet.auth).expect(200);
    expect(detail.body.status).toBe("treated");
    expect(detail.body.animal.status).toBe("under_treatment");

    // Lab request → lab pending, and the lab is notified.
    const lab = await ctx.request
      .post(api(`/cases/${caseId}/lab-requests`))
      .set(vet.auth)
      .send({ labOrgId, sampleType: "Epithelial tissue", tests: ["ELISA", "PCR"], priority: "urgent" })
      .expect(201);
    expect(lab.body.requestNumber).toMatch(/^LAB-\d{4}-\d{6}$/);
    detail = await ctx.request.get(api(`/cases/${caseId}`)).set(vet.auth).expect(200);
    expect(detail.body.status).toBe("lab_pending");
    const labInbox = await ctx.request.get(api("/notifications")).set(labTech.auth).expect(200);
    expect(labInbox.body.items[0]).toMatchObject({ type: "lab_request", data: { labRequestId: lab.body.id } });

    // The lab sees its queue and processes the sample; results can't go backwards.
    const labQueue = await ctx.request.get(api("/lab-requests")).set(labTech.auth).expect(200);
    expect(labQueue.body.items[0]).toMatchObject({ id: lab.body.id, priority: "urgent", caseNumber: detail.body.caseNumber });
    await ctx.request.patch(api(`/lab-requests/${lab.body.id}/status`)).set(labTech.auth).send({ status: "processing" }).expect(200);
    await ctx.request.patch(api(`/lab-requests/${lab.body.id}/status`)).set(labTech.auth).send({ status: "received" }).expect(409);
    await ctx.request.patch(api(`/lab-requests/${lab.body.id}/status`)).set(vet.auth).send({ status: "processing" }).expect(403);
    // Once linked by the lab request, the lab tech can see the case.
    await ctx.request.get(api(`/cases/${caseId}`)).set(labTech.auth).expect(200);

    const result = await ctx.request
      .post(api(`/lab-requests/${lab.body.id}/result`))
      .set(labTech.auth)
      .send({ result: "positive", resultDiseaseCode: "fmd", summary: "FMD virus type O detected." })
      .expect(200);
    expect(result.body).toMatchObject({ status: "completed", result: "positive" });

    // Results back → case returns to the vet's queue; notifiable disease alerts the state official.
    detail = await ctx.request.get(api(`/cases/${caseId}`)).set(vet.auth).expect(200);
    expect(detail.body.status).toBe("under_review");
    const officialInbox = await ctx.request.get(api("/notifications")).set(official.auth).expect(200);
    expect(officialInbox.body.items.some((n: { title: string }) => n.title.includes("Notifiable disease confirmed"))).toBe(true);
    const otherOfficialInbox = await ctx.request.get(api("/notifications")).set(kutchOfficial.auth).expect(200);
    expect(otherOfficialInbox.body.unreadCount).toBe(0);

    // Resolving needs an outcome; resolved cases only reopen.
    await ctx.request.patch(api(`/cases/${caseId}/status`)).set(vet.auth).send({ status: "resolved" }).expect(400);
    await ctx.request
      .patch(api(`/cases/${caseId}/assessment`))
      .set(vet.auth)
      .send({ confirmedDiseaseCode: "fmd" })
      .expect(200);
    const resolved = await ctx.request
      .patch(api(`/cases/${caseId}/status`))
      .set(vet.auth)
      .send({ status: "resolved", outcome: "recovered", note: "Lesions healed." })
      .expect(200);
    expect(resolved.body).toMatchObject({ status: "resolved", outcome: "recovered" });
    expect(resolved.body.animal.status).toBe("healthy");
    const bad = await ctx.request.patch(api(`/cases/${caseId}/status`)).set(vet.auth).send({ status: "treated" }).expect(409);
    expect(bad.body.error).toMatchObject({ code: "invalid_transition", details: { allowed: ["under_review"] } });
    await ctx.request.post(api(`/cases/${caseId}/treatments`)).set(vet.auth).send({ medicine: "X" }).expect(409);
  });

  it("shows the farmer a filtered timeline and the feedback they need", async () => {
    const detail = await ctx.request.get(api(`/cases/${caseId}`)).set(farmer.auth).expect(200);
    const bodies = detail.body.timeline.map((e: { body: string | null }) => e.body ?? "");
    expect(bodies.some((b: string) => b.includes("Isolate the animal"))).toBe(true);
    expect(bodies.some((b: string) => b.includes("Check neighbouring herds"))).toBe(false);
    expect(detail.body.treatments[0].notes).toBeUndefined();
    expect(detail.body.labRequests[0]).not.toHaveProperty("resultDetails");
    expect(detail.body.timeline.map((e: { type: string }) => e.type)).toEqual(
      expect.arrayContaining(["created", "status_changed", "advice", "treatment_added", "lab_requested", "lab_result"]),
    );

    const inbox = await ctx.request.get(api("/notifications")).set(farmer.auth).expect(200);
    const types = new Set(inbox.body.items.map((n: { type: string }) => n.type));
    for (const t of ["case_status", "advice", "treatment", "lab_result"]) expect(types).toContain(t);
    const withdrawal = inbox.body.items.find((n: { type: string }) => n.type === "treatment");
    expect(withdrawal.body).toContain("7 days");

    const read = await ctx.request.post(api("/notifications/read-all")).set(farmer.auth).expect(200);
    expect(read.body.updated).toBeGreaterThan(0);
    const after = await ctx.request.get(api("/notifications?unread=true")).set(farmer.auth).expect(200);
    expect(after.body.unreadCount).toBe(0);
  });

  it("records the animal's history", async () => {
    const history = await ctx.request.get(api(`/animals/${animalId}/history`)).set(farmer.auth).expect(200);
    const types = history.body.items.map((i: { type: string }) => i.type);
    expect(types).toEqual(expect.arrayContaining(["case", "treatment", "lab"]));
  });
});

describe("assignment and referral", () => {
  it("lets an official assign a vet, which starts the review", async () => {
    const report = await ctx.request.post(api("/cases")).set(farmer.auth).send({ herdId, symptomCodes: ["fever"] }).expect(201);
    const hospital = await ctx.createOrganization("hospital", "vh-anand-test", r.anand.id);
    const res = await ctx.request
      .post(api(`/cases/${report.body.id}/assign`))
      .set(official.auth)
      .send({ vetId: vet.id, organizationId: hospital.id, note: "Please visit today." })
      .expect(200);
    expect(res.body).toMatchObject({ status: "under_review", assignedVet: { id: vet.id }, assignedOrganization: { id: hospital.id } });
    // Officials coordinate but do not treat.
    await ctx.request.post(api(`/cases/${report.body.id}/treatments`)).set(official.auth).send({ medicine: "X" }).expect(403);
    // Assigning to a non-vet fails.
    await ctx.request.post(api(`/cases/${report.body.id}/assign`)).set(official.auth).send({ vetId: farmer.id }).expect(400);

    const visit = await ctx.request
      .post(api("/visits"))
      .set(vet.auth)
      .send({ caseId: report.body.id, scheduledAt: new Date(Date.now() + 86_400_000).toISOString(), purpose: "Initial examination" })
      .expect(201);
    const farmerVisits = await ctx.request.get(api("/visits")).set(farmer.auth).expect(200);
    expect(farmerVisits.body.items.map((v: { id: string }) => v.id)).toContain(visit.body.id);
    await ctx.request.patch(api(`/visits/${visit.body.id}`)).set(vet.auth).send({ status: "completed", notes: "Examined." }).expect(200);
    await ctx.request.patch(api(`/visits/${visit.body.id}`)).set(vet.auth).send({ status: "scheduled" }).expect(409);
  });
});

describe("hospital wards", () => {
  it("links a case reported for an admitted animal to its ward stay", async () => {
    const hospital = await ctx.createOrganization("hospital", "vh-ward-test", r.anand.id);
    const ward = await ctx.createUser("ward_staff", { organizationId: hospital.id, regionId: r.anand.id });
    const { herdId: h, animalId: a } = await ctx.createHerdWithAnimal(farmer, r.vadod.id);
    await ctx.request.post(api("/admissions")).set(ward.auth).send({ animalId: a, ward: "ICU" }).expect(201);
    const listed = await ctx.request.get(api("/admissions")).set(ward.auth).expect(200);
    expect(listed.body.items[0].animal).toMatchObject({ id: a, herdId: h });

    const c = await ctx.request.post(api("/cases")).set(ward.auth).send({ herdId: h, animalId: a, symptomCodes: ["fever"] }).expect(201);
    expect(c.body.assignedOrganization.id).toBe(hospital.id);
    const after = await ctx.request.get(api("/admissions")).set(ward.auth).expect(200);
    expect(after.body.items[0].case).toMatchObject({ id: c.body.id, caseNumber: c.body.caseNumber });
  });
});

describe("vet directory", () => {
  it("lists vets covering the caller's area with their open caseload", async () => {
    const res = await ctx.request.get(api("/directory/vets")).set(official.auth).expect(200);
    const names = res.body.items.map((v: { fullName: string }) => v.fullName);
    expect(names).toContain("Dr. Meera Patel");
    const meera = res.body.items.find((v: { id: string }) => v.id === vet.id);
    expect(meera.openCases).toBeGreaterThanOrEqual(1);
    const kutch = await ctx.request.get(api("/directory/vets")).set(kutchOfficial.auth).expect(200);
    expect(kutch.body.items.map((v: { id: string }) => v.id)).toEqual([kutchVet.id]);
    await ctx.request.get(api("/directory/vets")).set(farmer.auth).expect(403);
  });
});

describe("field workers", () => {
  it("register a farmer and herd, report for them, and the farmer later claims the account", async () => {
    const worker = await ctx.createUser("field_worker", { regionId: r.anandBlock.id });
    const herd = await ctx.request
      .post(api("/herds"))
      .set(worker.auth)
      .send({ name: "Sunita's cattle", regionId: r.kheda.id, owner: { fullName: "Sunita Devi", phone: "9812345678" } })
      .expect(201);
    expect(herd.body.owner).toMatchObject({ fullName: "Sunita Devi", role: "farmer" });

    // Outside their block: refused.
    await ctx.request.post(api("/herds")).set(worker.auth).send({ name: "Far away", regionId: r.madhapar.id, owner: { fullName: "X" } }).expect(403);

    const report = await ctx.request.post(api("/cases")).set(worker.auth).send({ herdId: herd.body.id, symptomCodes: ["fever"], animalsAffected: 3, animalsDead: 1 }).expect(201);
    expect(report.body.reporter.role).toBe("field_worker");

    // The farmer signs in by OTP for the first time and is linked to the record.
    await ctx.request.post(api("/auth/otp/request")).send({ phone: "9812345678" }).expect(200);
    const verified = await ctx.request.post(api("/auth/otp/verify")).send({ phone: "9812345678", otp: OTP }).expect(200);
    expect(verified.body.registrationRequired).toBe(false);
    expect(verified.body.user.fullName).toBe("Sunita Devi");
    const token = { Authorization: `Bearer ${verified.body.session.accessToken}` };
    const mine = await ctx.request.get(api("/cases")).set(token).expect(200);
    expect(mine.body.items.map((c: { id: string }) => c.id)).toEqual([report.body.id]);

    // The death reported with the case feeds mortality records.
    const deaths = await ctx.request.get(api(`/mortality?herdId=${herd.body.id}`)).set(token).expect(200);
    expect(deaths.body.items[0]).toMatchObject({ count: 1, caseId: report.body.id });
  });
});

describe("mortality", () => {
  it("marks the animal dead and blocks further reports on it", async () => {
    const { herdId: h, animalId: a } = await ctx.createHerdWithAnimal(farmer, r.vadod.id);
    const today = new Date().toISOString().slice(0, 10);
    await ctx.request.post(api("/mortality")).set(farmer.auth).send({ herdId: h, animalId: a, diedOn: today, suspectedCause: "Anthrax?" }).expect(201);
    const animal = await ctx.request.get(api(`/animals/${a}`)).set(farmer.auth).expect(200);
    expect(animal.body.status).toBe("dead");
    await ctx.request.post(api("/cases")).set(farmer.auth).send({ herdId: h, animalId: a, symptomCodes: ["fever"] }).expect(409);
    await ctx.request.post(api("/mortality")).set(farmer.auth).send({ herdId: h, animalId: a, diedOn: today }).expect(409);
    const inbox = await ctx.request.get(api("/notifications")).set(vet.auth).expect(200);
    expect(inbox.body.items.some((n: { title: string }) => n.title === "Livestock deaths reported")).toBe(true);
  });
});
