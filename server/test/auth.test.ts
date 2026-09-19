import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestContext, OTP, type TestContext } from "./helpers.js";

let ctx: TestContext;
let regions: Awaited<ReturnType<TestContext["createRegions"]>>;

beforeAll(async () => {
  ctx = await createTestContext();
  regions = await ctx.createRegions();
});
afterAll(() => ctx.close());

async function otpSignIn(phone: string) {
  await ctx.request.post("/api/v1/auth/otp/request").send({ phone }).expect(200);
  const res = await ctx.request.post("/api/v1/auth/otp/verify").send({ phone, otp: OTP }).expect(200);
  return res.body as { session: { accessToken: string; refreshToken: string }; user: unknown; registrationRequired: boolean };
}

describe("phone OTP sign-in and farmer registration", () => {
  it("normalises the phone, signs in, and asks an unknown number to register", async () => {
    const res = await ctx.request.post("/api/v1/auth/otp/request").send({ phone: "098765 11111" }).expect(200);
    expect(res.body.phone).toBe("+919876511111");
    const verified = await otpSignIn("9876511111");
    expect(verified.registrationRequired).toBe(true);
    expect(verified.user).toBeNull();

    // Protected routes explain what is missing rather than a bare 403.
    const blocked = await ctx.request
      .get("/api/v1/herds")
      .set("Authorization", `Bearer ${verified.session.accessToken}`)
      .expect(403);
    expect(blocked.body.error.code).toBe("profile_required");

    const registered = await ctx.request
      .post("/api/v1/auth/register/phone")
      .set("Authorization", `Bearer ${verified.session.accessToken}`)
      .send({ fullName: "Ramesh Kumar", regionId: regions.vadod.id, preferredLanguage: "gu" })
      .expect(201);
    expect(registered.body.user).toMatchObject({
      role: "farmer",
      status: "active",
      phone: "+919876511111",
      preferredLanguage: "gu",
    });
    expect(registered.body.user.region.path.map((p: { name: string }) => p.name)).toEqual([
      "Gujarat",
      "Anand",
      "Anand",
      "Vadod",
    ]);

    // Signing in again returns the account directly.
    const again = await otpSignIn("+91 98765 11111");
    expect(again.registrationRequired).toBe(false);
    await ctx.request.get("/api/v1/herds").set("Authorization", `Bearer ${again.session.accessToken}`).expect(200);
  });

  it("rejects a wrong OTP", async () => {
    await ctx.request.post("/api/v1/auth/otp/request").send({ phone: "9876522222" }).expect(200);
    const res = await ctx.request.post("/api/v1/auth/otp/verify").send({ phone: "9876522222", otp: "000000" }).expect(401);
    expect(res.body.error.code).toBe("invalid_otp");
  });

  it("rejects invalid phone numbers", async () => {
    const res = await ctx.request.post("/api/v1/auth/otp/request").send({ phone: "12345" }).expect(400);
    expect(res.body.error.code).toBe("validation_failed");
  });

  it("keeps non-farmer self-registrations pending until an admin approves", async () => {
    const admin = await ctx.createUser("admin");
    const { session } = await otpSignIn("9876533333");
    const auth = { Authorization: `Bearer ${session.accessToken}` };
    const res = await ctx.request
      .post("/api/v1/auth/register/phone")
      .set(auth)
      .send({ fullName: "Kiran Patel", role: "field_worker", regionId: regions.anandBlock.id })
      .expect(201);
    expect(res.body.user.status).toBe("pending");

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
    const { session } = await otpSignIn("9876544444");
    await ctx.request
      .post("/api/v1/auth/register/phone")
      .set("Authorization", `Bearer ${session.accessToken}`)
      .send({ fullName: "Mallory", role: "admin" })
      .expect(400);
  });
});

describe("institution sign-in", () => {
  it("registers staff by email, then signs in with the username once approved", async () => {
    const lab = await ctx.createOrganization("lab", "lab-auth-01", regions.anand.id);
    const reg = await ctx.request
      .post("/api/v1/auth/register/staff")
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
      .post("/api/v1/auth/register/staff")
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
      .post("/api/v1/auth/register/staff")
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
