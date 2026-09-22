import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestContext, type TestContext } from "./helpers.js";

let ctx: TestContext;
let regions: Awaited<ReturnType<TestContext["createRegions"]>>;

beforeAll(async () => {
  ctx = await createTestContext();
  regions = await ctx.createRegions();
});
afterAll(() => ctx.close());

describe("self-service registration", () => {
  it("registers a farmer by email, activates them, and signs them back in", async () => {
    const registered = await ctx.request
      .post("/api/v1/auth/register")
      .send({
        email: "Ramesh.Kumar@Example.org",
        password: "a-strong-password",
        fullName: "Ramesh Kumar",
        regionId: regions.vadod.id,
        phone: "098765 11111",
        preferredLanguage: "gu",
      })
      .expect(201);
    expect(registered.body.user).toMatchObject({
      role: "farmer",
      status: "active",
      email: "ramesh.kumar@example.org",
      // The phone is still stored, as the number a vet calls.
      phone: "+919876511111",
      preferredLanguage: "gu",
    });
    expect(registered.body.user.region.path.map((p: { name: string }) => p.name)).toEqual([
      "Gujarat",
      "Anand",
      "Anand",
      "Vadod",
    ]);

    const signedIn = await ctx.request
      .post("/api/v1/auth/login")
      .send({ identifier: "ramesh.kumar@example.org", password: "a-strong-password" })
      .expect(200);
    expect(signedIn.body.registrationRequired).toBe(false);
    await ctx.request
      .get("/api/v1/herds")
      .set("Authorization", `Bearer ${signedIn.body.session.accessToken}`)
      .expect(200);
  });

  it("refuses a duplicate email, username or phone", async () => {
    await ctx.request
      .post("/api/v1/auth/register")
      .send({ email: "dupe@example.org", password: "a-strong-password", fullName: "First", role: "vet", username: "dupe.vet" })
      .expect(201);

    const email = await ctx.request
      .post("/api/v1/auth/register")
      .send({ email: "dupe@example.org", password: "another-password", fullName: "Second", role: "vet" })
      .expect(409);
    expect(email.body.error.details.fields).toContain("email");

    const handle = await ctx.request
      .post("/api/v1/auth/register")
      .send({ email: "other@example.org", password: "another-password", fullName: "Third", role: "vet", username: "dupe.vet" })
      .expect(409);
    expect(handle.body.error.details.fields).toContain("username");
  });

  it("rejects a weak password and an invalid phone", async () => {
    const weak = await ctx.request
      .post("/api/v1/auth/register")
      .send({ email: "weak@example.org", password: "short", fullName: "Weak", regionId: regions.vadod.id })
      .expect(400);
    expect(weak.body.error.code).toBe("validation_failed");

    const phone = await ctx.request
      .post("/api/v1/auth/register")
      .send({ email: "badphone@example.org", password: "a-strong-password", fullName: "Bad", regionId: regions.vadod.id, phone: "12345" })
      .expect(400);
    expect(phone.body.error.code).toBe("validation_failed");
  });

  it("makes a farmer choose a village, not a state", async () => {
    await ctx.request
      .post("/api/v1/auth/register")
      .send({ email: "noregion@example.org", password: "a-strong-password", fullName: "Nowhere" })
      .expect(400);

    const tooBroad = await ctx.request
      .post("/api/v1/auth/register")
      .send({ email: "state@example.org", password: "a-strong-password", fullName: "Statewide", regionId: regions.state.id })
      .expect(400);
    expect(tooBroad.body.error.details.field).toBe("regionId");
  });

  it("keeps non-farmer self-registrations pending until an admin approves", async () => {
    const admin = await ctx.createUser("admin");
    const res = await ctx.request
      .post("/api/v1/auth/register")
      .send({
        email: "kiran.patel@example.org",
        password: "a-strong-password",
        fullName: "Kiran Patel",
        role: "field_worker",
        regionId: regions.anandBlock.id,
      })
      .expect(201);
    expect(res.body.user.status).toBe("pending");

    const auth = { Authorization: `Bearer ${res.body.session.accessToken}` };
    const blocked = await ctx.request.get("/api/v1/cases").set(auth).expect(403);
    expect(blocked.body.error.code).toBe("account_pending");
    // /me still works so the app can show "awaiting approval".
    const me = await ctx.request.get("/api/v1/me").set(auth).expect(200);
    expect(me.body.user.status).toBe("pending");

    // The admin was told, and can approve.
    const inbox = await ctx.request.get("/api/v1/notifications").set(admin.auth).expect(200);
    expect(inbox.body.items.some((n: { type: string }) => n.type === "account")).toBe(true);
    await ctx.request.post(`/api/v1/admin/users/${res.body.user.id}/approve`).set(admin.auth).send({}).expect(200);
    await ctx.request.get("/api/v1/cases").set(auth).expect(200);
  });

  it("does not let anyone self-register as an administrator", async () => {
    await ctx.request
      .post("/api/v1/auth/register")
      .send({ email: "mallory@example.org", password: "a-strong-password", fullName: "Mallory", role: "admin" })
      .expect(400);
  });
});

describe("institution sign-in", () => {
  it("registers staff by email, then signs in with the username once approved", async () => {
    const lab = await ctx.createOrganization("lab", "lab-auth-01", regions.anand.id);
    const reg = await ctx.request
      .post("/api/v1/auth/register")
      .send({
        email: "Priya.Sharma@Example.org",
        password: "a-strong-password",
        fullName: "Priya Sharma",
        role: "lab_tech",
        username: "priya.lab",
        organizationCode: "LAB-AUTH-01",
      })
      .expect(201);
    expect(reg.body.user).toMatchObject({ email: "priya.sharma@example.org", status: "pending", organizationId: lab.id });

    // Duplicate details are refused before any identity is created.
    const dup = await ctx.request
      .post("/api/v1/auth/register")
      .send({ email: "priya.sharma@example.org", password: "another-password", fullName: "X", role: "vet" })
      .expect(409);
    expect(dup.body.error.details.fields).toContain("email");

    const login = await ctx.request
      .post("/api/v1/auth/login")
      .send({ identifier: "priya.lab", password: "a-strong-password" })
      .expect(200);
    expect(login.body.user.status).toBe("pending");

    const wrong = await ctx.request.post("/api/v1/auth/login").send({ identifier: "priya.lab", password: "nope" }).expect(401);
    expect(wrong.body.error.code).toBe("invalid_credentials");
    await ctx.request.post("/api/v1/auth/login").send({ identifier: "nobody", password: "whatever1" }).expect(401);
  });

  it("refreshes and signs out", async () => {
    const reg = await ctx.request
      .post("/api/v1/auth/register")
      .send({ email: "vet.refresh@example.org", password: "a-strong-password", fullName: "Dr. R", role: "vet" })
      .expect(201);
    const refreshed = await ctx.request
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: reg.body.session.refreshToken })
      .expect(200);
    expect(refreshed.body.session.accessToken).toBeTruthy();
    // Refresh tokens rotate.
    await ctx.request.post("/api/v1/auth/refresh").send({ refreshToken: reg.body.session.refreshToken }).expect(401);
    await ctx.request
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${refreshed.body.session.accessToken}`)
      .expect(204);
    await ctx.request.post("/api/v1/auth/refresh").send({ refreshToken: refreshed.body.session.refreshToken }).expect(401);
  });
});

describe("tokens", () => {
  it("rejects missing and forged tokens", async () => {
    await ctx.request.get("/api/v1/cases").expect(401);
    const res = await ctx.request.get("/api/v1/cases").set("Authorization", "Bearer not.a.jwt").expect(401);
    expect(res.body.error.code).toBe("invalid_token");
  });

  it("serves public reference data without a token", async () => {
    const catalog = await ctx.request.get("/api/v1/catalog?lang=hi").expect(200);
    const fever = catalog.body.symptoms.find((s: { code: string }) => s.code === "fever");
    expect(fever.label).toBe("तेज़ बुखार");
    expect(catalog.body.enums.caseStatuses).toEqual(["active", "under_review", "lab_pending", "treated", "resolved"]);
    const states = await ctx.request.get("/api/v1/regions").expect(200);
    expect(states.body.items.map((r: { name: string }) => r.name)).toContain("Gujarat");
  });
});
