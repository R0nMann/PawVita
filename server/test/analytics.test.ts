import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestContext, type TestContext, type TestUser } from "./helpers.js";

let ctx: TestContext;
let r: Awaited<ReturnType<TestContext["createRegions"]>>;
let stateOfficial: TestUser;
let kutchOfficial: TestUser;
let vet: TestUser;
let admin: TestUser;

beforeAll(async () => {
  ctx = await createTestContext();
  r = await ctx.createRegions();
  stateOfficial = await ctx.createUser("official", { regionId: r.state.id });
  kutchOfficial = await ctx.createUser("official", { regionId: r.kutch.id });
  vet = await ctx.createUser("vet", { regionId: r.anand.id });
  admin = await ctx.createUser("admin");

  // Anand: two farmers, three cases (one high-risk FMD); Kutch: one case.
  const anandFarmer = await ctx.createUser("farmer", { regionId: r.vadod.id });
  const khedaFarmer = await ctx.createUser("farmer", { regionId: r.kheda.id });
  const kutchFarmer = await ctx.createUser("farmer", { regionId: r.madhapar.id });
  const a = await ctx.createHerdWithAnimal(anandFarmer, r.vadod.id);
  const k = await ctx.createHerdWithAnimal(khedaFarmer, r.kheda.id, "buffalo");
  const m = await ctx.createHerdWithAnimal(kutchFarmer, r.madhapar.id, "goat");

  const report = (user: TestUser, body: object) => ctx.request.post("/api/v1/cases").set(user.auth).send(body).expect(201);
  const c1 = await report(anandFarmer, { herdId: a.herdId, animalId: a.animalId, symptomCodes: ["blisters"], animalsDead: 2 });
  await report(anandFarmer, { herdId: a.herdId, symptomCodes: ["fever"] });
  await report(khedaFarmer, { herdId: k.herdId, animalId: k.animalId, symptomCodes: ["skin_nodules"] });
  await report(kutchFarmer, { herdId: m.herdId, animalId: m.animalId, symptomCodes: ["mouth_sores"], capturedOffline: true });
  await ctx.request.patch(`/api/v1/cases/${c1.body.id}/assessment`).set(vet.auth).send({ riskLevel: "high", suspectedDiseaseCode: "fmd" }).expect(200);

  await ctx.request.post("/api/v1/vaccinations").set(vet.auth).send({ animalId: a.animalId, vaccineCode: "fmd", administeredOn: new Date().toISOString().slice(0, 10) }).expect(201);
});
afterAll(() => ctx.close());

describe("analytics", () => {
  it("summarises the official's area", async () => {
    const res = await ctx.request.get("/api/v1/analytics/overview").set(stateOfficial.auth).expect(200);
    expect(res.body.scope).toMatchObject({ name: "Gujarat", level: "state" });
    expect(res.body.cases).toMatchObject({
      reported: 4,
      reportedOffline: 1,
      open: 4,
      openNotifiable: 1,
      openByStatus: { active: 3, under_review: 1 },
      openByRisk: { high: 1, unassessed: 3 },
    });
    expect(res.body.deaths).toBe(2);
    expect(res.body.animals).toBe(3);
    expect(res.body.vaccination).toMatchObject({ animals: 3, upToDate: 1, coveragePercent: 33.3 });
    expect(res.body.responseTimeHours.average).not.toBeNull();
  });

  it("rolls cases up by district and by village", async () => {
    const districts = await ctx.request.get("/api/v1/analytics/regions").set(stateOfficial.auth).expect(200);
    expect(districts.body.level).toBe("district");
    const byName = Object.fromEntries(districts.body.items.map((i: { region: { name: string }; cases: number }) => [i.region.name, i]));
    expect(byName.Anand).toMatchObject({ cases: 3, open: 3, highRiskOpen: 1, deaths: 2 });
    expect(byName.Kutch).toMatchObject({ cases: 1 });

    const villages = await ctx.request.get(`/api/v1/analytics/regions?regionId=${r.anand.id}&level=village`).set(vet.auth).expect(200);
    expect(villages.body.items.map((i: { region: { name: string }; cases: number }) => [i.region.name, i.cases]).sort()).toEqual([
      ["Kheda", 1],
      ["Vadod", 2],
    ]);
    const fmdOnly = await ctx.request.get("/api/v1/analytics/regions?diseaseCode=fmd").set(stateOfficial.auth).expect(200);
    expect(fmdOnly.body.items).toHaveLength(1);
  });

  it("keeps officials inside their own area", async () => {
    const own = await ctx.request.get("/api/v1/analytics/overview").set(kutchOfficial.auth).expect(200);
    expect(own.body.cases.reported).toBe(1);
    await ctx.request.get(`/api/v1/analytics/overview?regionId=${r.anand.id}`).set(kutchOfficial.auth).expect(403);
    await ctx.request.get(`/api/v1/analytics/regions?level=state`).set(stateOfficial.auth).expect(400);
  });

  it("builds trend series and vaccination-gap tables", async () => {
    const trends = await ctx.request.get("/api/v1/analytics/trends?interval=day&groupBy=disease").set(stateOfficial.auth).expect(200);
    expect(trends.body.keys).toEqual(["fmd", "undiagnosed"]);
    expect(trends.body.buckets.at(-1)).toMatchObject({ total: 4, counts: { fmd: 1, undiagnosed: 3 } });
    const flat = await ctx.request.get("/api/v1/analytics/trends?interval=month").set(stateOfficial.auth).expect(200);
    expect(flat.body).toMatchObject({ keys: ["total"], buckets: [{ total: 4 }] });
    const deaths = await ctx.request.get("/api/v1/analytics/trends?interval=week&metric=deaths").set(stateOfficial.auth).expect(200);
    expect(deaths.body.buckets.at(-1).total).toBe(2);

    const gaps = await ctx.request.get("/api/v1/analytics/vaccination-coverage?vaccineCode=fmd").set(stateOfficial.auth).expect(200);
    const anand = gaps.body.items.find((i: { region: { name: string } }) => i.region.name === "Anand");
    expect(anand).toMatchObject({ animals: 2, upToDate: 1, neverVaccinated: 1, coveragePercent: 50 });
    // Worst coverage first.
    expect(gaps.body.items[0].region.name).toBe("Kutch");

    const species = await ctx.request.get("/api/v1/analytics/species").set(admin.auth).expect(200);
    expect(species.body.items.map((i: { species: string }) => i.species).sort()).toEqual(["buffalo", "cattle", "goat", "unspecified"]);
  });

  it("is closed to farmers and open to landing-page aggregates", async () => {
    const farmer = await ctx.createUser("farmer", { regionId: r.vadod.id });
    await ctx.request.get("/api/v1/analytics/overview").set(farmer.auth).expect(403);
    const stats = await ctx.request.get("/api/v1/public/stats").expect(200);
    expect(stats.body).toMatchObject({ activeCases: 4, animalsMonitored: 3 });
    const trends = await ctx.request.get("/api/v1/public/trends?months=3").expect(200);
    expect(trends.body.keys).toEqual(["fmd"]);
    expect(trends.body.buckets).toHaveLength(3);
    expect(trends.body.buckets.at(-1).counts).toEqual({ fmd: 1 });
    const alerts = await ctx.request.get("/api/v1/public/alerts").expect(200);
    expect(alerts.body.items[0]).toMatchObject({ district: "Anand", diseaseCode: "fmd", severity: "high" });
    expect(JSON.stringify(alerts.body)).not.toContain("farmer");
  });

  it("reports system health to admins", async () => {
    const res = await ctx.request.get("/api/v1/admin/system-health").set(admin.auth).expect(200);
    expect(res.body.services.database.status).toBe("operational");
    expect(res.body.services.ai.status).toBe("not_configured");
    expect(res.body.queues.offlineSyncLast7Days.count).toBe(1);
    await ctx.request.get("/api/v1/admin/system-health").set(stateOfficial.auth).expect(403);
  });
});
