import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { createTestContext, OTP, type TestContext } from "./helpers.js";
import { LocalAuthProvider } from "../src/auth/local.js";
import { users } from "../src/db/schema.js";
import { BrevoEmailProvider, EmailError, type EmailMessage } from "../src/email/index.js";
import { otpEmail } from "../src/email/templates.js";
import { verifyHookSignature } from "../src/routes/hooks.js";

const PASSWORD = "correct-horse-battery";
const HOOK_SECRET = `v1,whsec_${Buffer.from("pawvita-test-hook-secret-0123456789").toString("base64")}`;

/** Sign a body the way Supabase's Send Email hook does (Standard Webhooks). */
function signHook(body: string, secret = HOOK_SECRET, id = "msg_1", timestamp = String(Math.floor(Date.now() / 1000))) {
  const key = Buffer.from(secret.replace(/^v1,/, "").replace(/^whsec_/, ""), "base64");
  const signature = crypto.createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64");
  return { "webhook-id": id, "webhook-timestamp": timestamp, "webhook-signature": `v1,${signature}` };
}

describe("two-factor staff sign-in", () => {
  let ctx: TestContext;
  /** Codes the local auth stand-in would have emailed, newest last. */
  const sent: { email: string; otp: string }[] = [];

  beforeAll(async () => {
    // The stand-in hands every code to onOtp; capture those as an inbox would.
    const auth = new LocalAuthProvider({
      jwtSecret: "test-secret-0123456789abcdef0123456789",
      file: null,
      // The shared helper signs farmers in with this fixed code.
      fixedOtp: OTP,
      onOtp: (email, otp) => sent.push({ email, otp }),
    });
    ctx = await createTestContext({ TWO_FACTOR_ENABLED: "true" }, { auth });
  });
  afterAll(async () => await ctx.close());

  it("asks for an emailed code instead of handing over a session", async () => {
    const staff = await ctx.createUser("vet", { email: "twofactor.vet@test.pawvita.in" });
    expect(staff.token).toBeTruthy();

    const login = await ctx.request
      .post("/api/v1/auth/login")
      .send({ identifier: "twofactor.vet@test.pawvita.in", password: PASSWORD })
      .expect(200);

    expect(login.body).toMatchObject({ twoFactorRequired: true, session: null, user: null });
    // The address is masked, so a shoulder-surfer learns nothing new.
    expect(login.body.email).toMatch(/^tw•+@test\.pawvita\.in$/);
    expect(login.body.email).not.toContain("twofactor.vet");

    const code = sent.at(-1)!;
    expect(code).toMatchObject({ email: "twofactor.vet@test.pawvita.in" });

    const wrong = await ctx.request
      .post("/api/v1/auth/login/verify")
      .send({ identifier: "twofactor.vet@test.pawvita.in", otp: "000000" })
      .expect(401);
    expect(wrong.body.error.code).toBe("invalid_otp");

    const verified = await ctx.request
      .post("/api/v1/auth/login/verify")
      .send({ identifier: "twofactor.vet@test.pawvita.in", otp: code.otp })
      .expect(200);
    expect(verified.body.session.accessToken).toBeTruthy();
    expect(verified.body.user.email).toBe("twofactor.vet@test.pawvita.in");

    // A code is single-use.
    await ctx.request
      .post("/api/v1/auth/login/verify")
      .send({ identifier: "twofactor.vet@test.pawvita.in", otp: code.otp })
      .expect(401);
  });

  it("sends no code when the password is wrong", async () => {
    await ctx.createUser("vet", { email: "badpass.vet@test.pawvita.in" });
    const before = sent.length;
    await ctx.request
      .post("/api/v1/auth/login")
      .send({ identifier: "badpass.vet@test.pawvita.in", password: "not-the-password" })
      .expect(401);
    expect(sent.length).toBe(before);
  });

  it("lets an exempt account (the demo logins) straight through", async () => {
    const demo = await ctx.createUser("lab_tech", { email: "demo.lab@test.pawvita.in" });
    await ctx.deps.db.update(users).set({ twoFactorExempt: true }).where(eq(users.id, demo.id));

    const before = sent.length;
    const login = await ctx.request
      .post("/api/v1/auth/login")
      .send({ identifier: "demo.lab@test.pawvita.in", password: PASSWORD })
      .expect(200);
    expect(login.body.twoFactorRequired).toBe(false);
    expect(login.body.session.accessToken).toBeTruthy();
    expect(login.body.user.email).toBe("demo.lab@test.pawvita.in");
    expect(sent.length).toBe(before);
  });

  it("puts farmers through exactly the same flow", async () => {
    await ctx.createUser("farmer", { email: "ramesh@test.pawvita.in" });

    const login = await ctx.request
      .post("/api/v1/auth/login")
      .send({ identifier: "ramesh@test.pawvita.in", password: PASSWORD })
      .expect(200);
    expect(login.body).toMatchObject({ twoFactorRequired: true, session: null });

    const code = sent.at(-1)!;
    expect(code.email).toBe("ramesh@test.pawvita.in");
    const verified = await ctx.request
      .post("/api/v1/auth/login/verify")
      .send({ identifier: "ramesh@test.pawvita.in", otp: code.otp })
      .expect(200);
    expect(verified.body.user.role).toBe("farmer");
  });
});

describe("the Supabase send-email hook", () => {
  let ctx: TestContext;
  const outbox: EmailMessage[] = [];

  beforeAll(async () => {
    ctx = await createTestContext(
      { TWO_FACTOR_ENABLED: "true", EMAIL_HOOK_SECRET: HOOK_SECRET },
      { email: { name: "log", send: async (m) => void outbox.push(m) } },
    );
  });
  afterAll(async () => await ctx.close());

  const payload = {
    user: { email: "meera.patel@pawvita.in" },
    email_data: { token: "123456", email_action_type: "login" },
  };

  it("delivers a signed code through the email provider", async () => {
    const body = JSON.stringify(payload);
    await ctx.request.post("/api/v1/hooks/send-email").set(signHook(body)).type("json").send(body).expect(200);

    const message = outbox.at(-1)!;
    expect(message.to).toBe("meera.patel@pawvita.in");
    expect(message.subject).toBe("Your PawVita sign-in code");
    expect(message.html).toContain("123456");
    expect(message.text).toContain("Code: 123456");
    // Link-free on purpose: a typed code is harder to phish than a button.
    expect(message.html).not.toMatch(/<a\s/i);
  });

  it("refuses a bad signature, a stale timestamp and a missing one", async () => {
    const body = JSON.stringify(payload);
    const before = outbox.length;

    const forged = { ...signHook(body), "webhook-signature": "v1,AAAA" };
    await ctx.request.post("/api/v1/hooks/send-email").set(forged).type("json").send(body).expect(401);

    const stale = signHook(body, HOOK_SECRET, "msg_2", String(Math.floor(Date.now() / 1000) - 3600));
    await ctx.request.post("/api/v1/hooks/send-email").set(stale).type("json").send(body).expect(401);

    await ctx.request.post("/api/v1/hooks/send-email").type("json").send(body).expect(401);

    // A body altered after signing must not verify.
    const tampered = JSON.stringify({ ...payload, user: { email: "attacker@example.com" } });
    await ctx.request.post("/api/v1/hooks/send-email").set(signHook(body)).type("json").send(tampered).expect(401);

    expect(outbox.length).toBe(before);
  });
});

describe("hook signature verification", () => {
  const body = Buffer.from('{"hello":"world"}');
  const sign = (id: string, ts: string) =>
    crypto
      .createHmac("sha256", Buffer.from(HOOK_SECRET.replace(/^v1,whsec_/, ""), "base64"))
      .update(`${id}.${ts}.${body.toString()}`)
      .digest("base64");

  it("accepts any listed signature, so a secret can be rotated", () => {
    const ts = String(Math.floor(Date.now() / 1000));
    const good = sign("id1", ts);
    expect(
      verifyHookSignature({
        secret: HOOK_SECRET,
        id: "id1",
        timestamp: ts,
        body,
        signatureHeader: `v1,AAAA v1,${good}`,
      }),
    ).toBe(true);
  });

  it("rejects an unknown version, a wrong id and a non-numeric timestamp", () => {
    const ts = String(Math.floor(Date.now() / 1000));
    const good = sign("id1", ts);
    const base = { secret: HOOK_SECRET, id: "id1", timestamp: ts, body };
    expect(verifyHookSignature({ ...base, signatureHeader: `v2,${good}` })).toBe(false);
    expect(verifyHookSignature({ ...base, id: "id2", signatureHeader: `v1,${good}` })).toBe(false);
    expect(verifyHookSignature({ ...base, timestamp: "not-a-time", signatureHeader: `v1,${good}` })).toBe(false);
  });
});

describe("the Brevo transport", () => {
  const message = otpEmail({ to: "vet@pawvita.in", code: "654321", action: "login", minutes: 60 });

  it("posts the message to Brevo's transactional endpoint", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 201 }));
    const brevo = new BrevoEmailProvider("key-123", { email: "no-reply@pawvita.in", name: "PawVita" }, fetchMock as never);
    await brevo.send(message);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect((init.headers as Record<string, string>)["api-key"]).toBe("key-123");
    expect(JSON.parse(init.body as string)).toMatchObject({
      sender: { email: "no-reply@pawvita.in", name: "PawVita" },
      to: [{ email: "vet@pawvita.in" }],
      subject: "Your PawVita sign-in code",
      tags: ["auth-login"],
    });
  });

  it("raises a readable error when Brevo rejects the message", async () => {
    const fetchMock = vi.fn(async () => new Response('{"code":"unauthorized"}', { status: 401 }));
    const brevo = new BrevoEmailProvider("bad", { email: "no-reply@pawvita.in", name: "PawVita" }, fetchMock as never);
    await expect(brevo.send(message)).rejects.toBeInstanceOf(EmailError);
    await expect(brevo.send(message)).rejects.toThrow(/401/);
  });

  it("escapes the code into the HTML and keeps the plain-text part", () => {
    const injected = otpEmail({ to: "a@b.c", code: "<script>", action: "login", minutes: 5 });
    expect(injected.html).not.toContain("<script>");
    expect(injected.html).toContain("&lt;script&gt;");
    expect(injected.text).toContain("Code: <script>");
    expect(injected.text).toContain("expires in 5 minutes");
  });
});
