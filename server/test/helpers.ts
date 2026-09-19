import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pino } from "pino";
import supertest from "supertest";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { seedCatalog } from "../src/db/catalog.js";
import { eq } from "drizzle-orm";
import { regions, users, organizations } from "../src/db/schema.js";
import type { Deps } from "../src/deps.js";
import { createDeps } from "../src/providers.js";
import { insertRegion } from "../src/services/regions-admin.js";

export const OTP = "123456";

export type Role = (typeof users.$inferInsert)["role"];

export interface TestUser {
  id: string;
  token: string;
  auth: { Authorization: string };
}

/** A fresh app on an in-memory Postgres with local auth and on-disk uploads in a temp dir. */
export async function createTestContext(env: Record<string, string> = {}) {
  const uploads = fs.mkdtempSync(path.join(os.tmpdir(), "pawvita-test-"));
  const config = loadConfig({
    NODE_ENV: "test",
    LOCAL_AUTH_FIXED_OTP: OTP,
    LOCAL_STORAGE_DIR: uploads,
    MAX_UPLOAD_MB: "1",
    ...env,
  });
  const deps = await createDeps(config, { logger: pino({ level: "silent" }) });
  await deps.database.migrate();
  await seedCatalog(deps.db);
  const app = createApp(deps);
  const request = supertest(app);

  let phoneCounter = 0;
  let emailCounter = 0;

  /** Create an active account and sign it in. */
  async function createUser(
    role: Role,
    options: { regionId?: string | null; organizationId?: string | null; fullName?: string; phone?: string; email?: string } = {},
  ): Promise<TestUser> {
    const usePhone = options.phone ?? (options.email ? undefined : role === "farmer" || role === "field_worker");
    let session;
    let phone: string | undefined;
    let email: string | undefined;
    if (usePhone) {
      phone = typeof options.phone === "string" ? options.phone : `+9198${String(76000000 + ++phoneCounter).padStart(8, "0")}`;
      await deps.auth.requestOtp(phone);
      session = await deps.auth.verifyOtp(phone, OTP);
    } else {
      email = options.email ?? `staff${++emailCounter}@test.pawvita.in`;
      await deps.auth.adminCreateUser({ email, password: "correct-horse-battery" });
      session = await deps.auth.signInWithPassword(email, "correct-horse-battery");
    }
    const [row] = await deps.db
      .insert(users)
      .values({
        authUserId: session.authUserId,
        role,
        status: "active",
        fullName: options.fullName ?? `Test ${role}`,
        phone,
        email,
        regionId: options.regionId ?? null,
        organizationId: options.organizationId ?? null,
      })
      .returning({ id: users.id });
    return { id: row!.id, token: session.accessToken, auth: { Authorization: `Bearer ${session.accessToken}` } };
  }

  /**
   * Two districts in one state, each with a block and villages:
   *   Gujarat → Anand → Anand block → Vadod, Kheda
   *   Gujarat → Kutch → Bhuj block → Madhapar
   */
  async function createRegions() {
    const [india] = await deps.db.select().from(regions).where(eq(regions.code, "IN"));
    const state = await insertRegion(deps.db, { name: "Gujarat", level: "state", code: "T-GJ", parentId: india!.id });
    const anand = await insertRegion(deps.db, { name: "Anand", level: "district", code: "T-ANAND", parentId: state.id, lat: 22.56, lng: 72.95 });
    const anandBlock = await insertRegion(deps.db, { name: "Anand", level: "block", code: "T-ANAND-B", parentId: anand.id });
    const vadod = await insertRegion(deps.db, { name: "Vadod", level: "village", code: "T-VADOD", parentId: anandBlock.id });
    const kheda = await insertRegion(deps.db, { name: "Kheda", level: "village", code: "T-KHEDA", parentId: anandBlock.id });
    const kutch = await insertRegion(deps.db, { name: "Kutch", level: "district", code: "T-KUTCH", parentId: state.id, lat: 23.25, lng: 69.67 });
    const bhuj = await insertRegion(deps.db, { name: "Bhuj", level: "block", code: "T-BHUJ", parentId: kutch.id });
    const madhapar = await insertRegion(deps.db, { name: "Madhapar", level: "village", code: "T-MADHAPAR", parentId: bhuj.id });
    return { india: india!, state, anand, anandBlock, vadod, kheda, kutch, bhuj, madhapar };
  }

  async function createOrganization(type: "hospital" | "lab" | "department", code: string, regionId?: string) {
    const [org] = await deps.db
      .insert(organizations)
      .values({ type, code, name: `${type} ${code}`, regionId })
      .returning();
    return org!;
  }

  /** A farmer's herd and one animal, created through the API. */
  async function createHerdWithAnimal(owner: TestUser, regionId: string, species = "cattle") {
    const herd = await request.post("/api/v1/herds").set(owner.auth).send({ name: "Test herd", regionId }).expect(201);
    const animal = await request
      .post("/api/v1/animals")
      .set(owner.auth)
      .send({ herdId: herd.body.id, name: "Gauri", species, tagNumber: `TAG-${Math.random().toString(36).slice(2, 10)}` })
      .expect(201);
    return { herdId: herd.body.id as string, animalId: animal.body.id as string };
  }

  async function close() {
    await deps.database.close();
    fs.rmSync(uploads, { recursive: true, force: true });
  }

  return { deps, app, request, createUser, createRegions, createOrganization, createHerdWithAnimal, close };
}

export type TestContext = Awaited<ReturnType<typeof createTestContext>>;
export type { Deps };
