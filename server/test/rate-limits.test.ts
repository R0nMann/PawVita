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

  it("limits sign-in attempts per identifier", async () => {
    const attempt = (identifier: string) =>
      ctx.request.post("/api/v1/auth/login").send({ identifier, password: "not-the-password" });

    for (let i = 0; i < 10; i++) await attempt("target@test.pawvita.in").expect(401);
    // Case and surrounding space still count as the same account.
    await attempt("  Target@Test.PawVita.in  ").expect(429);
    // A different account has its own budget.
    await attempt("someone.else@test.pawvita.in").expect(401);
  });
});
