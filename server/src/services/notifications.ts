import { and, eq, inArray, or } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { herds, notifications, regions, users, type NOTIFICATION_TYPES } from "../db/schema.js";
import type { Ancestry } from "../lib/regions.js";

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface NotificationInput {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  /** Same key for the same user is stored once — used by scheduled reminders. */
  dedupeKey?: string;
}

/**
 * In-app notifications (architecture §10, "feedback to farmer").
 *
 * Only the in-app channel exists today. SMS / push delivery would hook in
 * here, after the insert, without callers changing.
 */
export async function notify(
  db: Db,
  recipientIds: Iterable<string | null | undefined>,
  input: NotificationInput,
  options: { exclude?: string } = {},
): Promise<number> {
  const unique = [...new Set([...recipientIds].filter((id): id is string => !!id && id !== options.exclude))];
  if (!unique.length) return 0;
  const inserted = await db
    .insert(notifications)
    .values(
      unique.map((userId) => ({
        userId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: input.data ?? {},
        dedupeKey: input.dedupeKey,
      })),
    )
    .onConflictDoNothing()
    .returning({ id: notifications.id });
  return inserted.length;
}

/** The farmer side of a case: whoever reported it and whoever owns the herd. */
export async function reporterSideIds(db: Db, c: { reportedById: string; herdId: string }): Promise<string[]> {
  const [herd] = await db.select({ ownerId: herds.ownerId }).from(herds).where(eq(herds.id, c.herdId));
  return [c.reportedById, herd?.ownerId].filter((v): v is string => !!v);
}

/**
 * Active staff with `role` whose area of responsibility covers a location,
 * including national-level accounts.
 */
export async function staffCovering(db: Db, location: Ancestry, role: "vet" | "official"): Promise<string[]> {
  const regionIds = [location.stateId, location.districtId, location.blockId, location.villageId].filter(
    (v): v is string => !!v,
  );
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .innerJoin(regions, eq(regions.id, users.regionId))
    .where(
      and(
        eq(users.role, role),
        eq(users.status, "active"),
        or(inArray(users.regionId, regionIds), eq(regions.level, "country")),
      ),
    );
  return rows.map((r) => r.id);
}

/** Vets to tell about a new case or unexplained deaths at a location. */
export function vetsCovering(db: Db, location: Ancestry): Promise<string[]> {
  return staffCovering(db, location, "vet");
}
