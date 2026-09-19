import { and, eq, gte, lte, sql } from "drizzle-orm";
import { animals, fieldVisits, herds, vaccinations, vaccines } from "../db/schema.js";
import type { Deps } from "../deps.js";
import { notify } from "./notifications.js";

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

/**
 * Vaccination reminders and visit reminders (architecture §10). Safe to run
 * as often as you like and on several instances at once: each reminder has a
 * dedupe key, so a farmer is told about a given due date only once.
 */
export async function runReminders(deps: Deps, now = new Date()) {
  const { db, config } = deps;
  const today = isoDay(now);
  const horizon = new Date(now);
  horizon.setUTCDate(horizon.getUTCDate() + config.jobs.reminderLookaheadDays);
  const graceStart = new Date(now);
  graceStart.setUTCDate(graceStart.getUTCDate() - 30);

  // Latest dose per animal and vaccine, due within the look-ahead window or
  // overdue by up to 30 days (older gaps are left to vaccination-gap reports).
  const latest = db
    .selectDistinctOn([vaccinations.animalId, vaccinations.vaccineCode], {
      animalId: vaccinations.animalId,
      vaccineCode: vaccinations.vaccineCode,
      nextDueOn: vaccinations.nextDueOn,
    })
    .from(vaccinations)
    .orderBy(vaccinations.animalId, vaccinations.vaccineCode, sql`${vaccinations.administeredOn} desc`, sql`${vaccinations.createdAt} desc`)
    .as("latest");
  const due = await db
    .select({
      animalId: latest.animalId,
      vaccineCode: latest.vaccineCode,
      nextDueOn: latest.nextDueOn,
      vaccineName: vaccines.name,
      animalName: animals.name,
      tagNumber: animals.tagNumber,
      ownerId: herds.ownerId,
    })
    .from(latest)
    .innerJoin(animals, eq(animals.id, latest.animalId))
    .innerJoin(herds, eq(herds.id, animals.herdId))
    .innerJoin(vaccines, eq(vaccines.code, latest.vaccineCode))
    .where(
      and(
        sql`${animals.status} not in ('dead', 'sold')`,
        gte(latest.nextDueOn, isoDay(graceStart)),
        lte(latest.nextDueOn, isoDay(horizon)),
      ),
    );

  let vaccinationReminders = 0;
  for (const d of due) {
    const overdue = d.nextDueOn! < today;
    const who = d.animalName ?? d.tagNumber ?? "One of your animals";
    vaccinationReminders += await notify(db, [d.ownerId], {
      type: "vaccination_reminder",
      title: overdue ? `Vaccination overdue: ${d.vaccineName}` : `Vaccination due: ${d.vaccineName}`,
      body: overdue
        ? `${who} missed the ${d.vaccineName} dose due on ${d.nextDueOn}. Contact your vet.`
        : `${who} is due for ${d.vaccineName} on ${d.nextDueOn}.`,
      data: { animalId: d.animalId, vaccineCode: d.vaccineCode, nextDueOn: d.nextDueOn },
      // One "due" and one "overdue" reminder per dose.
      dedupeKey: `vaccination:${d.animalId}:${d.vaccineCode}:${d.nextDueOn}:${overdue ? "overdue" : "due"}`,
    });
  }

  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const visits = await db
    .select({ visit: fieldVisits, herdName: herds.name, ownerId: herds.ownerId })
    .from(fieldVisits)
    .innerJoin(herds, eq(herds.id, fieldVisits.herdId))
    .where(and(eq(fieldVisits.status, "scheduled"), gte(fieldVisits.scheduledAt, now), lte(fieldVisits.scheduledAt, tomorrow)));
  let visitReminders = 0;
  for (const { visit, herdName, ownerId } of visits) {
    const when = visit.scheduledAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", timeStyle: "short", dateStyle: "medium" });
    visitReminders += await notify(db, [visit.vetId, ownerId], {
      type: "visit",
      title: "Vet visit tomorrow",
      body: `Visit to ${herdName} on ${when}${visit.purpose ? ` — ${visit.purpose}` : ""}.`,
      data: { visitId: visit.id, caseId: visit.caseId },
      dedupeKey: `visit:${visit.id}:${visit.scheduledAt.toISOString()}`,
    });
  }

  return { vaccinationReminders, visitReminders };
}

/** Run reminders on an interval. Returns a function that stops the timer. */
export function startJobs(deps: Deps): () => void {
  if (!deps.config.jobs.enabled) return () => {};
  const run = () =>
    runReminders(deps)
      .then((r) => deps.logger.info(r, "Reminders sent"))
      .catch((err) => deps.logger.error({ err }, "Reminder job failed"));
  const first = setTimeout(run, 10_000);
  const timer = setInterval(run, deps.config.jobs.intervalMinutes * 60 * 1000);
  first.unref();
  timer.unref();
  return () => {
    clearTimeout(first);
    clearInterval(timer);
  };
}
