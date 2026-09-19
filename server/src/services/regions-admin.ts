import { eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { regions } from "../db/schema.js";
import { badRequest } from "../lib/errors.js";
import { LEVEL_DEPTH, type RegionLevel } from "../lib/regions.js";

export interface NewRegion {
  name: string;
  level: RegionLevel;
  parentId?: string | null;
  code?: string | null;
  lat?: number | null;
  lng?: number | null;
}

/**
 * Insert a region, filling in its ancestry from the parent. Each level must
 * sit directly under the level above it (state under country or nothing,
 * district under state, and so on).
 */
export async function insertRegion(db: Db, input: NewRegion) {
  let parent: typeof regions.$inferSelect | undefined;
  if (input.parentId) {
    [parent] = await db.select().from(regions).where(eq(regions.id, input.parentId));
    if (!parent) throw badRequest("Unknown parent region.", { parentId: input.parentId });
  }
  const depth = LEVEL_DEPTH[input.level];
  if (parent ? LEVEL_DEPTH[parent.level] !== depth - 1 : depth > 1) {
    throw badRequest(
      parent
        ? `A ${input.level} cannot sit directly under a ${parent.level}.`
        : `A ${input.level} needs a parent region.`,
    );
  }
  const id = crypto.randomUUID();
  const ancestry = {
    stateId: parent?.stateId ?? null,
    districtId: parent?.districtId ?? null,
    blockId: parent?.blockId ?? null,
    villageId: null as string | null,
  };
  if (input.level !== "country") ancestry[`${input.level}Id` as keyof typeof ancestry] = id;
  const [row] = await db
    .insert(regions)
    .values({
      id,
      name: input.name,
      level: input.level,
      parentId: parent?.id ?? null,
      code: input.code ?? null,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      ...ancestry,
    })
    .returning();
  return row!;
}
