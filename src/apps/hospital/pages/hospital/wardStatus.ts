import type { AdmissionListItem } from "../../../../api/types";

/**
 * The ward's four-colour status for an admitted animal, derived from its open
 * case and its health status: critical (high-risk case), under observation
 * (sick or being treated), recovering, or healthy.
 */
export type WardStatus = "critical" | "under-observation" | "recovering" | "healthy";

export function wardStatus(a: AdmissionListItem): WardStatus {
  if (a.case && a.case.status !== "resolved" && a.case.riskLevel === "high") return "critical";
  if (a.animal.status === "recovering") return "recovering";
  if (a.animal.status === "sick" || a.animal.status === "under_treatment") return "under-observation";
  if (a.case && a.case.status !== "resolved") return "under-observation";
  return "healthy";
}

export const WARD_STATUS: Record<WardStatus, { label: string; color: string; bg: string; border: string; dot: string }> = {
  healthy: { label: "Healthy", color: "text-green-700", bg: "bg-green-100", border: "border-[#E8E5DF]", dot: "bg-green-500" },
  critical: { label: "Critical", color: "text-red-600", bg: "bg-red-100", border: "border-[#E63946] bg-red-50/30", dot: "bg-[#E63946]" },
  recovering: { label: "Recovering", color: "text-amber-700", bg: "bg-amber-100", border: "border-[#F4A300] bg-amber-50/30", dot: "bg-[#F4A300]" },
  "under-observation": { label: "Observation", color: "text-blue-600", bg: "bg-blue-100", border: "border-[#4A90D9] bg-blue-50/30", dot: "bg-[#4A90D9]" },
};

/** Where a ward tile leads: its case if it has one, otherwise the report form for that animal. */
export function wardLink(a: AdmissionListItem): string {
  return a.case ? `/hospital/ward/case-status/${a.case.id}` : `/hospital/ward/report-symptom?animalId=${a.animal.id}`;
}
