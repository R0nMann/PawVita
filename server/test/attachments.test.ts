import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestContext, type TestContext, type TestUser } from "./helpers.js";

// A real 1×1 PNG.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);
const HTML = Buffer.from("<!doctype html><script>alert(document.cookie)</script>");

let ctx: TestContext;
let farmer: TestUser;
let stranger: TestUser;
let vet: TestUser;
let caseId: string;

beforeAll(async () => {
  ctx = await createTestContext();
  const r = await ctx.createRegions();
  farmer = await ctx.createUser("farmer", { regionId: r.vadod.id });
  stranger = await ctx.createUser("farmer", { regionId: r.kheda.id });
  vet = await ctx.createUser("vet", { regionId: r.anand.id });
  const { herdId } = await ctx.createHerdWithAnimal(farmer, r.vadod.id);
  const c = await ctx.request.post("/api/v1/cases").set(farmer.auth).send({ herdId, symptomCodes: ["skin_nodules"] }).expect(201);
  caseId = c.body.id;
});
afterAll(() => ctx.close());

describe("attachments", () => {
  it("stores a case photo idempotently and serves it to people who can see the case", async () => {
    const id = randomUUID();
    const upload = () =>
      ctx.request
        .post("/api/v1/attachments")
        .set(farmer.auth)
        .field("id", id)
        .field("kind", "photo")
        .field("caseId", caseId)
        // The declared type is ignored; the bytes decide.
        .attach("file", PNG, { filename: "cow.png", contentType: "application/octet-stream" });
    const first = await upload().expect(201);
    expect(first.body).toMatchObject({ id, kind: "photo", contentType: "image/png", sizeBytes: PNG.length });
    await upload().expect(200);

    const detail = await ctx.request.get(`/api/v1/cases/${caseId}`).set(vet.auth).expect(200);
    expect(detail.body.attachments).toHaveLength(1);
    expect(detail.body.timeline.some((e: { type: string }) => e.type === "attachment_added")).toBe(true);

    // The embedded signed URL works without a token (for <img src>), from another origin.
    const signed = detail.body.attachments[0].url as string;
    const content = await ctx.request.get(signed).expect(200);
    expect(content.headers["content-type"]).toBe("image/png");
    expect(content.headers["cross-origin-resource-policy"]).toBe("cross-origin");
    expect(Buffer.compare(content.body as Buffer, PNG)).toBe(0);

    // /content checks access, then redirects to a fresh signed link.
    const redirect = await ctx.request.get(first.body.contentUrl).set(vet.auth).expect(302);
    await ctx.request.get(redirect.headers.location!).expect(200);
    await ctx.request.get(first.body.contentUrl).set(stranger.auth).expect(404);
    await ctx.request.get(first.body.contentUrl).expect(401);

    // Tampered or expired links are refused.
    await ctx.request.get(signed.replace(/signature=[^&]+/, "signature=forged")).expect(403);
    await ctx.request.get(signed.replace(/expires=\d+/, "expires=1000")).expect(403);
  });

  it("rejects files whose contents do not match the kind", async () => {
    const res = await ctx.request
      .post("/api/v1/attachments")
      .set(farmer.auth)
      .field("kind", "photo")
      .field("caseId", caseId)
      .attach("file", HTML, { filename: "cow.jpg", contentType: "image/jpeg" })
      .expect(415);
    expect(res.body.error.code).toBe("unsupported_media_type");
    await ctx.request
      .post("/api/v1/attachments")
      .set(farmer.auth)
      .field("kind", "voice")
      .field("caseId", caseId)
      .attach("file", PNG, "note.webm")
      .expect(415);
  });

  it("enforces the target and size rules", async () => {
    await ctx.request
      .post("/api/v1/attachments")
      .set(stranger.auth)
      .field("kind", "photo")
      .field("caseId", caseId)
      .attach("file", PNG, "cow.png")
      .expect(404);
    await ctx.request.post("/api/v1/attachments").set(farmer.auth).field("kind", "photo").attach("file", PNG, "cow.png").expect(400);
    const big = Buffer.concat([PNG, Buffer.alloc(1024 * 1024 + 1)]);
    const res = await ctx.request
      .post("/api/v1/attachments")
      .set(farmer.auth)
      .field("kind", "photo")
      .field("caseId", caseId)
      .attach("file", big, "big.png")
      .expect(413);
    expect(res.body.error.code).toBe("limit_file_size");
  });
});
