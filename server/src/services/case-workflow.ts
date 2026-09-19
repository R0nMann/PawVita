import { and, eq, isNull, notInArray, sql } from "drizzle-orm";
import type { CurrentUser } from "../auth/middleware.js";
import type { Db } from "../db/client.js";
import { caseEvents, cases, labRequests, type CASE_EVENT_TYPES, type CASE_OUTCOMES, type CASE_STATUSES } from "../db/schema.js";
import { HttpError } from "../lib/errors.js";
import { notify, reporterSideIds } from "./notifications.js";

export type CaseStatus = (typeof CASE_STATUSES)[number];
export type CaseOutcome = (typeof CASE_OUTCOMES)[number];
export type CaseEventType = (typeof CASE_EVENT_TYPES)[number];
export type CaseRow = typeof cases.$inferSelect;

/**
 * Allowed status moves. The happy path is the architecture's
 * Active → Under Review → Lab Pending → Treated → Resolved; vets may also
 * skip ahead (treat on the first visit), step back (relapse, repeat test) or
 * reopen a resolved case.
 */
export const CASE_TRANSITIONS: Record<CaseStatus, readonly CaseStatus[]> = {
  active: ["under_review", "lab_pending", "treated", "resolved"],
  under_review: ["lab_pending", "treated", "resolved"],
  lab_pending: ["under_review", "treated", "resolved"],
  treated: ["under_review", "lab_pending", "resolved"],
  resolved: ["under_review"],
};

/** Farmer-facing wording for status notifications. */
export const STATUS_MESSAGES: Record<CaseStatus, string> = {
  active: "Your report has been received.",
  under_review: "A veterinarian is reviewing your case.",
  lab_pending: "Samples have been sent to the laboratory for testing.",
  treated: "Treatment has been given. Follow the vet's instructions.",
  resolved: "Your case has been closed.",
};

export const STATUS_LABELS: Record<CaseStatus, string> = {
  active: "Active",
  under_review: "Under review",
  lab_pending: "Lab pending",
  treated: "Treated",
  resolved: "Resolved",
};

export async function recordCaseEvent(
  db: Db,
  event: {
    caseId: string;
    type: CaseEventType;
    actorId: string | null;
    body?: string | null;
    data?: Record<string, unknown>;
    fromStatus?: CaseStatus;
    toStatus?: CaseStatus;
    visibleToReporter?: boolean;
  },
) {
  const [row] = await db
    .insert(caseEvents)
    .values({
      caseId: event.caseId,
      type: event.type,
      actorId: event.actorId,
      body: event.body ?? null,
      data: event.data ?? {},
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      visibleToReporter: event.visibleToReporter ?? false,
    })
    .returning();
  return row!;
}

/** Stamp the first veterinary action on a case, for response-time reporting. */
export async function markFirstResponse(db: Db, caseId: string, actor: CurrentUser) {
  if (actor.role !== "vet") return;
  await db
    .update(cases)
    .set({ firstResponseAt: sql`now()` })
    .where(and(eq(cases.id, caseId), isNull(cases.firstResponseAt)));
}

/**
 * Move a case to a new status, record it on the timeline and tell the farmer.
 * Call inside a transaction; `c` must be the current row.
 */
export async function transitionCase(
  db: Db,
  c: CaseRow,
  to: CaseStatus,
  actor: CurrentUser | null,
  options: { note?: string | null; outcome?: CaseOutcome | null; automatic?: boolean } = {},
): Promise<CaseRow> {
  if (c.status === to) return c;
  if (!CASE_TRANSITIONS[c.status].includes(to)) {
    throw new HttpError(409, "invalid_transition", `A case cannot move from ${c.status} to ${to}.`, {
      from: c.status,
      to,
      allowed: CASE_TRANSITIONS[c.status],
    });
  }
  if (to === "resolved" && !options.outcome) {
    throw new HttpError(400, "outcome_required", "Give an outcome when resolving a case.");
  }

  const [updated] = await db
    .update(cases)
    .set({
      status: to,
      resolvedAt: to === "resolved" ? sql`now()` : null,
      outcome: to === "resolved" ? options.outcome : null,
    })
    // Guard against a concurrent change between read and write.
    .where(and(eq(cases.id, c.id), eq(cases.status, c.status)))
    .returning();
  if (!updated) throw new HttpError(409, "stale_case", "The case changed while you were editing it. Reload and retry.");

  await recordCaseEvent(db, {
    caseId: c.id,
    type: "status_changed",
    actorId: actor?.id ?? null,
    fromStatus: c.status,
    toStatus: to,
    body: options.note ?? null,
    data: { automatic: !!options.automatic, ...(options.outcome && { outcome: options.outcome }) },
    visibleToReporter: true,
  });
  if (actor) await markFirstResponse(db, c.id, actor);

  await notify(
    db,
    await reporterSideIds(db, c),
    {
      type: "case_status",
      title: `Case ${c.caseNumber}: ${STATUS_LABELS[to]}`,
      body: options.note ? `${STATUS_MESSAGES[to]} ${options.note}` : STATUS_MESSAGES[to],
      data: { caseId: c.id, status: to },
    },
    { exclude: actor?.id },
  );
  return updated;
}

/**
 * After a lab result, return a case to the vet's queue once no other sample
 * for it is still outstanding.
 */
export async function releaseFromLabIfDone(db: Db, caseId: string) {
  const [c] = await db.select().from(cases).where(eq(cases.id, caseId));
  if (!c || c.status !== "lab_pending") return;
  const [open] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(labRequests)
    .where(and(eq(labRequests.caseId, caseId), notInArray(labRequests.status, ["completed", "rejected"])));
  if ((open?.n ?? 0) > 0) return;
  await transitionCase(db, c, "under_review", null, {
    automatic: true,
    note: "Laboratory results are in.",
  });
}
