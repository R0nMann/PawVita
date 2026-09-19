import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestContext, type TestContext } from "./helpers.js";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await createTestContext({ RATE_LIMITS_ENABLED: "true", RATE_LIMIT_PER_MINUTE: "3" });
});
afterAll(() => ctx.close());

describe("rate limits", () => {
  it("counts API calls per account, so people behind one IP do not block each other", async () => {
    const a = await ctx.createUser("farmer");
    const b = await ctx.createUser("farmer");
    for (let i = 0; i < 3; i++) await ctx.request.get("/api/v1/notifications").set(a.auth).expect(200);
    const blocked = await ctx.request.get("/api/v1/notifications").set(a.auth).expect(429);
    expect(blocked.body.error.code).toBe("rate_limited");
    // Same IP, different account: its own budget.
    await ctx.request.get("/api/v1/notifications").set(b.auth).expect(200);
  });

  it("limits OTP sends per phone number", async () => {
    for (let i = 0; i < 5; i++) {
      await ctx.request.post("/api/v1/auth/otp/request").send({ phone: "9876500001" }).expect(200);
    }
    // The same number written differently still counts as the same phone.
    await ctx.request.post("/api/v1/auth/otp/request").send({ phone: "+91 98765 00001" }).expect(429);
    await ctx.request.post("/api/v1/auth/otp/request").send({ phone: "9876500002" }).expect(200);
  });
});
