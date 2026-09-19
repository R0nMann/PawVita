import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runReminders } from "../src/services/jobs.js";
import { createTestContext, type TestContext, type TestUser } from "./helpers.js";

let ctx: TestContext;
let farmer: TestUser;
let vet: TestUser;
let herdId: string;
let animalId: string;

const day = (offset: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};

beforeAll(async () => {
  ctx = await createTestContext();
  const r = await ctx.createRegions();
  farmer = await ctx.createUser("farmer", { regionId: r.vadod.id });
  vet = await ctx.createUser("vet", { regionId: r.anand.id });
  ({ herdId, animalId } = await ctx.createHerdWithAnimal(farmer, r.vadod.id));
});
afterAll(() => ctx.close());

describe("vaccinations", () => {
  it("derives the next due date from the vaccine's booster interval", async () => {
    const res = await ctx.request
      .post("/api/v1/vaccinations")
      .set(vet.auth)
      .send({ animalId, vaccineCode: "fmd", administeredOn: day(-175) })
      .expect(201);
    expect(res.body).toMatchObject({ nextDueOn: day(5), administeredById: vet.id, recordedById: vet.id });
    // Farmers can record a dose someone else gave; it is not attributed to them.
    const own = await ctx.request
      .post("/api/v1/vaccinations")
      .set(farmer.auth)
      .send({ animalId, vaccineCode: "brucella_s19", administeredOn: day(-30) })
      .expect(201);
    expect(own.body).toMatchObject({ nextDueOn: null, administeredById: null });
    await ctx.request.post("/api/v1/vaccinations").set(farmer.auth).send({ animalId, vaccineCode: "fmd", administeredOn: day(3) }).expect(400);
  });

  it("vaccinates a whole herd in one batch", async () => {
    const second = await ctx.request.post("/api/v1/animals").set(farmer.auth).send({ herdId, species: "buffalo", name: "Moti" }).expect(201);
    const res = await ctx.request
      .post("/api/v1/vaccinations/batch")
      .set(vet.auth)
      .send({ animalIds: [animalId, second.body.id], vaccineCode: "hs_bq", administeredOn: day(-380), batchNumber: "HSBQ-24-11" })
      .expect(201);
    expect(res.body.count).toBe(2);
    await ctx.request.post("/api/v1/vaccinations/batch").set(farmer.auth).send({ animalIds: [animalId], vaccineCode: "fmd", administeredOn: day(0) }).expect(403);
  });

  it("lists due and overdue doses, latest dose per vaccine only", async () => {
    const due = await ctx.request.get("/api/v1/vaccinations/due?withinDays=30").set(farmer.auth).expect(200);
    const summary = due.body.items.map((i: { vaccineCode: string; status: string }) => `${i.vaccineCode}:${i.status}`).sort();
    expect(summary).toEqual(["fmd:upcoming", "hs_bq:overdue", "hs_bq:overdue"]);
    const upcoming = await ctx.request.get("/api/v1/vaccinations/due?withinDays=30&includeOverdue=false").set(farmer.auth).expect(200);
    expect(upcoming.body.items).toHaveLength(1);

    const animal = await ctx.request.get(`/api/v1/animals/${animalId}`).set(farmer.auth).expect(200);
    expect(animal.body.vaccinations.find((v: { vaccineCode: string }) => v.vaccineCode === "fmd").status).toBe("up_to_date");
  });

  it("sends each reminder once, however often the job runs", async () => {
    const first = await runReminders(ctx.deps);
    expect(first.vaccinationReminders).toBe(3);
    const second = await runReminders(ctx.deps);
    expect(second.vaccinationReminders).toBe(0);
    const inbox = await ctx.request.get("/api/v1/notifications").set(farmer.auth).expect(200);
    const titles = inbox.body.items.filter((n: { type: string }) => n.type === "vaccination_reminder").map((n: { title: string }) => n.title);
    expect(titles.filter((t: string) => t.startsWith("Vaccination overdue"))).toHaveLength(2);
    expect(titles.filter((t: string) => t.startsWith("Vaccination due"))).toHaveLength(1);
  });
});
