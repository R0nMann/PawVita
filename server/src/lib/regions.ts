import { eq, inArray, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import type { Db } from "../db/client.js";
import { regions, type REGION_LEVELS } from "../db/schema.js";
import { badRequest } from "./errors.js";

export type RegionLevel = (typeof REGION_LEVELS)[number];

/** A region with its denormalised ancestry, as stored on the regions row. */
export interface RegionRef {
  id: string;
  level: RegionLevel;
  name: string;
  stateId: string | null;
  districtId: string | null;
  blockId: string | null;
  villageId: string | null;
}

/** The ancestry columns copied onto herds and cases. */
export interface Ancestry {
  stateId: string | null;
  districtId: string | null;
  blockId: string | null;
  villageId: string | null;
}

export interface AncestryColumns {
  stateId: AnyPgColumn;
  districtId: AnyPgColumn;
  blockId: AnyPgColumn;
  villageId: AnyPgColumn;
}

const regionRefColumns = {
  id: regions.id,
  level: regions.level,
  name: regions.name,
  stateId: regions.stateId,
  districtId: regions.districtId,
  blockId: regions.blockId,
  villageId: regions.villageId,
};

export async function findRegion(db: Db, id: string): Promise<RegionRef | undefined> {
  const [row] = await db.select(regionRefColumns).from(regions).where(eq(regions.id, id));
  return row;
}

export async function requireRegion(db: Db, id: string): Promise<RegionRef> {
  const region = await findRegion(db, id);
  if (!region) throw badRequest("Unknown region.", { regionId: id });
  return region;
}

export function ancestryOf(region: RegionRef): Ancestry {
  return {
    stateId: region.stateId,
    districtId: region.districtId,
    blockId: region.blockId,
    villageId: region.villageId,
  };
}

/** Column holding the ancestor at `level`, or null for `country` (matches everything). */
export function columnForLevel(cols: AncestryColumns, level: RegionLevel): AnyPgColumn | null {
  switch (level) {
    case "country":
      return null;
    case "state":
      return cols.stateId;
    case "district":
      return cols.districtId;
    case "block":
      return cols.blockId;
    case "village":
      return cols.villageId;
  }
}

/** SQL condition: the row's ancestry places it inside `region`. */
export function withinRegion(cols: AncestryColumns, region: RegionRef): SQL {
  const column = columnForLevel(cols, region.level);
  return column ? eq(column, region.id) : sql`true`;
}

/** True when `inner` is `outer` or lies inside it. */
export function regionContains(outer: RegionRef, inner: RegionRef): boolean {
  if (outer.level === "country") return true;
  const key = `${outer.level}Id` as keyof Ancestry;
  return inner[key] === outer.id;
}

/** Ids of `region` and every ancestor above it — used to match advisories. */
export function regionAndAncestorIds(region: RegionRef): string[] {
  return [region.stateId, region.districtId, region.blockId, region.villageId, region.id].filter(
    (v, i, all): v is string => !!v && all.indexOf(v) === i,
  );
}

export interface RegionSummary {
  id: string;
  name: string;
  level: RegionLevel;
  /** Ancestors from state down to the region itself, for display ("Kheda, Anand, Gujarat"). */
  path: { id: string; name: string; level: RegionLevel }[];
}

/** Describe many regions (with their ancestor names) in one query. */
export async function describeRegions(db: Db, ids: Iterable<string | null | undefined>): Promise<Map<string, RegionSummary>> {
  const wanted = [...new Set([...ids].filter((v): v is string => !!v))];
  const out = new Map<string, RegionSummary>();
  if (!wanted.length) return out;
  const base = await db.select().from(regions).where(inArray(regions.id, wanted));
  const ancestorIds = new Set<string>();
  for (const r of base) {
    for (const a of [r.stateId, r.districtId, r.blockId, r.villageId]) if (a) ancestorIds.add(a);
  }
  const all = new Map(base.map((r) => [r.id, r]));
  const missing = [...ancestorIds].filter((a) => !all.has(a));
  if (missing.length) {
    for (const r of await db.select().from(regions).where(inArray(regions.id, missing))) all.set(r.id, r);
  }
  for (const r of base) {
    const path = [r.stateId, r.districtId, r.blockId, r.villageId]
      .filter((a): a is string => !!a)
      .map((a) => all.get(a))
      .filter((a): a is NonNullable<typeof a> => !!a)
      .map((a) => ({ id: a.id, name: a.name, level: a.level }));
    out.set(r.id, { id: r.id, name: r.name, level: r.level, path });
  }
  return out;
}

export async function describeRegion(db: Db, id: string | null | undefined): Promise<RegionSummary | null> {
  if (!id) return null;
  return (await describeRegions(db, [id])).get(id) ?? null;
}

export const LEVEL_DEPTH: Record<RegionLevel, number> = {
  country: 0,
  state: 1,
  district: 2,
  block: 3,
  village: 4,
};
