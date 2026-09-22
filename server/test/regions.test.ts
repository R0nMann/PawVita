import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asc, eq } from "drizzle-orm";
import { createTestContext, type TestContext } from "./helpers.js";
import { flattenRegionTree, INDIA_REGION_TREE, seedRegions } from "../src/db/regions.js";
import { regions } from "../src/db/schema.js";
import { describeRegion } from "../src/lib/regions.js";

let ctx: TestContext;

beforeAll(async () => {
  // The context seeds the catalogue, which seeds the national hierarchy.
  ctx = await createTestContext();
});
afterAll(async () => await ctx.close());

describe("the national region hierarchy", () => {
  it("covers all 28 states and 8 union territories, each with districts, blocks and villages", async () => {
    expect(INDIA_REGION_TREE).toHaveLength(36);
    for (const state of INDIA_REGION_TREE) {
      expect(state.districts.length, state.name).toBeGreaterThanOrEqual(1);
      for (const district of state.districts) {
        expect(district.blocks.length, `${state.name} / ${district.name}`).toBeGreaterThanOrEqual(2);
      }
    }

    const rows = await ctx.deps.db.select().from(regions);
    const flat = flattenRegionTree();
    const byLevel = (level: string) => flat.filter((r) => r.level === level).length;
    expect(rows).toHaveLength(flat.length);
    expect(byLevel("state")).toBe(36);
    expect(byLevel("village")).toBe(byLevel("block"));

    const states = rows.filter((r) => r.level === "state").map((r) => r.name);
    for (const name of ["Gujarat", "Nagaland", "Lakshadweep", "Delhi", "Ladakh", "Puducherry"]) {
      expect(states).toContain(name);
    }
  });

  it("gives every row a unique code and a full ancestry", async () => {
    const rows = await ctx.deps.db.select().from(regions);
    expect(new Set(rows.map((r) => r.code)).size).toBe(rows.length);
    for (const r of rows) {
      expect(r.code!.length, r.code!).toBeLessThanOrEqual(40);
      if (r.level === "country") continue;
      expect(r.stateId, r.name).not.toBeNull();
      expect(r.parentId, r.name).not.toBeNull();
      if (r.level === "village") expect(r.villageId).toBe(r.id);
      if (r.level === "block") expect(r.blockId).toBe(r.id);
    }

    const [vadod] = await ctx.deps.db.select().from(regions).where(eq(regions.code, "GJ-ANAND-ANAND-VADOD"));
    const path = await describeRegion(ctx.deps.db, vadod!.id);
    expect(path!.path.map((p) => p.name)).toEqual(["Gujarat", "Anand", "Anand", "Vadod"]);
  });

  it("drills down through the public endpoint, state to village", async () => {
    const states = await ctx.request.get("/api/v1/regions?level=state&limit=500").expect(200);
    expect(states.body.items).toHaveLength(36);

    const sikkim = states.body.items.find((s: { code: string }) => s.code === "SK");
    const districts = await ctx.request.get(`/api/v1/regions?parentId=${sikkim.id}`).expect(200);
    expect(districts.body.items.map((d: { name: string }) => d.name)).toEqual(["Gangtok", "Gyalshing"]);

    const blocks = await ctx.request.get(`/api/v1/regions?parentId=${districts.body.items[0].id}`).expect(200);
    expect(blocks.body.items.length).toBeGreaterThanOrEqual(2);

    const villages = await ctx.request.get(`/api/v1/regions?parentId=${blocks.body.items[0].id}`).expect(200);
    expect(villages.body.items).toHaveLength(1);
    expect(villages.body.items[0].level).toBe("village");
  });

  it("reseeds without duplicating or overwriting", async () => {
    const before = await ctx.deps.db.select().from(regions).orderBy(asc(regions.code));
    await ctx.deps.db.update(regions).set({ name: "Anand (renamed)" }).where(eq(regions.code, "GJ-ANAND"));

    expect(await seedRegions(ctx.deps.db)).toMatchObject({ created: 0, existing: before.length });
    const after = await ctx.deps.db.select().from(regions).orderBy(asc(regions.code));
    expect(after.map((r) => r.id)).toEqual(before.map((r) => r.id));
    expect(after.find((r) => r.code === "GJ-ANAND")!.name).toBe("Anand (renamed)");
  });
});
