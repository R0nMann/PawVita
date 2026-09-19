import type { AI_MODULES, AiPrediction, RISK_LEVELS } from "../db/schema.js";

/**
 * Hand-off point to the AI Intelligence Layer (architecture §6–§7).
 *
 * The backend calls `assessCase` after a case is reported and again when new
 * evidence (a photo, a voice note) arrives. Whatever the service returns is
 * stored in `ai_assessments`, added to the case timeline and shown to vets,
 * who can accept or reject it. Nothing here makes a diagnosis on its own.
 *
 * The AI services are not built yet, so the default is `NoopAiService`, which
 * reports itself disabled and returns nothing. To connect the real services,
 * implement `AiService` (for example an HTTP client for AI_SERVICE_URL) and
 * pass it to `createApp`.
 */

export type AiModule = (typeof AI_MODULES)[number];
export type RiskLevel = (typeof RISK_LEVELS)[number];

/** Everything the AI modules need about a case, collected by the backend. */
export interface CaseForAssessment {
  caseId: string;
  reason: "case_created" | "attachment_added";
  species: string | null;
  animalsAffected: number;
  animalsDead: number;
  symptomCodes: string[];
  description: string | null;
  onsetDate: string | null;
  location: {
    lat: number | null;
    lng: number | null;
    stateId: string | null;
    districtId: string | null;
    blockId: string | null;
    villageId: string | null;
  };
  /** Short-lived URLs (or storage keys) for photos and voice notes. */
  media: { kind: "photo" | "voice"; attachmentId: string; url: string | null; storageKey: string }[];
  reportedAt: string;
}

export interface AiAssessmentResult {
  module: AiModule;
  modelName: string;
  modelVersion: string;
  predictions: AiPrediction[];
  riskLevel?: RiskLevel;
  confidence?: number;
  summary?: string;
  raw?: unknown;
}

export interface AiService {
  readonly enabled: boolean;
  assessCase(input: CaseForAssessment): Promise<AiAssessmentResult[]>;
}

export class NoopAiService implements AiService {
  readonly enabled = false;
  async assessCase(): Promise<AiAssessmentResult[]> {
    return [];
  }
}
