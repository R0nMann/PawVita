import { and, eq, inArray } from "drizzle-orm";
import type { CaseForAssessment } from "../ai/index.js";
import { aiAssessments, animals, attachments, cases, caseSymptoms } from "../db/schema.js";
import type { Deps } from "../deps.js";
import { recordCaseEvent } from "./case-workflow.js";

/**
 * Send a case to the AI services and store what comes back. Runs after the
 * request has been answered — reporting must never wait on, or fail because
 * of, the AI layer. With the default no-op service this returns immediately.
 */
export async function runAiAssessment(deps: Deps, caseId: string, reason: CaseForAssessment["reason"]) {
  if (!deps.ai.enabled) return;
  const { db } = deps;

  const [row] = await db
    .select({ c: cases, species: animals.species })
    .from(cases)
    .leftJoin(animals, eq(animals.id, cases.animalId))
    .where(eq(cases.id, caseId));
  if (!row) return;
  const c = row.c;

  const symptomRows = await db
    .select({ code: caseSymptoms.symptomCode })
    .from(caseSymptoms)
    .where(eq(caseSymptoms.caseId, caseId));
  const media = await db
    .select()
    .from(attachments)
    .where(and(eq(attachments.caseId, caseId), inArray(attachments.kind, ["photo", "voice"])));

  const input: CaseForAssessment = {
    caseId,
    reason,
    species: row.species,
    animalsAffected: c.animalsAffected,
    animalsDead: c.animalsDead,
    symptomCodes: symptomRows.map((s) => s.code),
    description: c.description,
    onsetDate: c.onsetDate,
    location: {
      lat: c.lat,
      lng: c.lng,
      stateId: c.stateId,
      districtId: c.districtId,
      blockId: c.blockId,
      villageId: c.villageId,
    },
    media: await Promise.all(
      media.map(async (m) => ({
        kind: m.kind as "photo" | "voice",
        attachmentId: m.id,
        storageKey: m.storageKey,
        url: await deps.storage.signedUrl(m.storageKey, 15 * 60),
      })),
    ),
    reportedAt: c.reportedAt.toISOString(),
  };

  try {
    const results = await deps.ai.assessCase(input);
    for (const r of results) {
      const [saved] = await db
        .insert(aiAssessments)
        .values({
          caseId,
          module: r.module,
          status: "completed",
          modelName: r.modelName,
          modelVersion: r.modelVersion,
          predictions: r.predictions,
          riskLevel: r.riskLevel,
          confidence: r.confidence,
          summary: r.summary,
          raw: r.raw ?? null,
          completedAt: new Date(),
        })
        .returning({ id: aiAssessments.id });
      await recordCaseEvent(db, {
        caseId,
        type: "ai_assessment",
        actorId: null,
        body: r.summary ?? null,
        data: { assessmentId: saved!.id, module: r.module, riskLevel: r.riskLevel ?? null },
      });
    }
  } catch (err) {
    deps.logger.warn({ err, caseId }, "AI assessment failed");
    await db.insert(aiAssessments).values({
      caseId,
      module: "combined",
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
      completedAt: new Date(),
    });
  }
}

/** Fire-and-forget wrapper used by request handlers. */
export function scheduleAiAssessment(deps: Deps, caseId: string, reason: CaseForAssessment["reason"]) {
  if (!deps.ai.enabled) return;
  setImmediate(() => {
    runAiAssessment(deps, caseId, reason).catch((err) =>
      deps.logger.error({ err, caseId }, "AI assessment crashed"),
    );
  });
}
