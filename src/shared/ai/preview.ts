import type { AiAssessment } from "../../api/types";

/**
 * Stand-in for the AI Intelligence Layer (architecture §6) until the real
 * services exist. Every "AI" panel in both portals reads from here or from
 * the portal's `data/aiPreview.ts`, so replacing this module is the whole
 * job of wiring in real models.
 *
 * The same symptom rules drive the farmer's report screen and the vet's case
 * screen, so both see the same preliminary result for a given case.
 */

export interface PreviewDiagnosis {
  disease: string;
  diseaseCode: string | null;
  confidence: number;
  advice: string;
}

const FMD: PreviewDiagnosis[] = [
  {
    disease: "Foot-and-Mouth Disease (FMD)",
    diseaseCode: "fmd",
    confidence: 94,
    advice: "Isolate the animal immediately. Do not move livestock. Contact your nearest vet.",
  },
  {
    disease: "Vesicular Stomatitis",
    diseaseCode: null,
    confidence: 42,
    advice: "Keep the animal hydrated. Monitor other animals.",
  },
];

const RULES: { all: string[]; results: PreviewDiagnosis[] }[] = [
  { all: ["blisters", "drooling"], results: FMD },
  { all: ["blisters", "lameness"], results: FMD },
  {
    all: ["skin_nodules", "fever"],
    results: [
      {
        disease: "Lumpy Skin Disease (LSD)",
        diseaseCode: "lsd",
        confidence: 88,
        advice: "Isolate affected animals. Spray insect repellents. Contact vet for vaccination of healthy animals.",
      },
    ],
  },
  {
    all: ["fever", "breathing_difficulty"],
    results: [
      {
        disease: "Hemorrhagic Septicemia (HS)",
        diseaseCode: "hs",
        confidence: 85,
        advice: "This is an emergency. Contact your vet immediately. HS progresses rapidly.",
      },
    ],
  },
  {
    all: ["fever", "throat_swelling"],
    results: [
      {
        disease: "Hemorrhagic Septicemia (HS)",
        diseaseCode: "hs",
        confidence: 85,
        advice: "This is an emergency. Contact your vet immediately. HS progresses rapidly.",
      },
    ],
  },
];

const FALLBACK: PreviewDiagnosis = {
  disease: "General Illness / Unknown",
  diseaseCode: null,
  confidence: 60,
  advice: "A veterinarian will assess the animal and provide a proper diagnosis. Report submitted.",
};

/** Preliminary diagnoses for a set of symptom codes, most likely first. */
export function previewDiagnosis(symptomCodes: string[]): PreviewDiagnosis[] {
  const chosen = new Set(symptomCodes);
  const matches = RULES.filter((r) => r.all.every((c) => chosen.has(c))).flatMap((r) => r.results);
  const unique = matches.filter((m, i) => matches.findIndex((x) => x.disease === m.disease) === i);
  return unique.length ? unique.sort((a, b) => b.confidence - a.confidence) : [FALLBACK];
}

/**
 * The AI summary shown on a case: a real completed assessment when the AI
 * services have produced one, otherwise the preview for its symptoms.
 */
export function caseAiSummary(symptomCodes: string[], assessments: AiAssessment[] = []) {
  const real = assessments.find((a) => a.status === "completed" && a.predictions.length);
  if (real) {
    const top = [...real.predictions].sort((a, b) => b.confidence - a.confidence)[0]!;
    const confidence = top.confidence <= 1 ? Math.round(top.confidence * 100) : Math.round(top.confidence);
    return { disease: top.label, confidence, note: real.summary ?? `${real.module} model ${real.modelVersion ?? ""}`.trim() };
  }
  const top = previewDiagnosis(symptomCodes)[0]!;
  return { disease: top.disease, confidence: top.confidence, note: top.advice };
}

/** The prototype's simulated speech-to-text: a fixed transcript and the symptoms "heard" in it. */
export const VOICE_PREVIEW = {
  farmer: {
    transcript: "Animal has blisters on mouth and is limping since yesterday. Saliva dripping. Not eating.",
    symptomCodes: ["blisters", "lameness", "drooling", "loss_of_appetite"],
  },
  ward: {
    transcript:
      "The animal has been showing high fever since yesterday morning, blisters on the tongue, and is not eating. It's also limping on the right front leg.",
    symptomCodes: ["fever", "blisters", "lameness", "loss_of_appetite"],
  },
};
