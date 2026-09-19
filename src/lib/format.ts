import type {
  AnimalStatus,
  CaseStatus,
  Catalog,
  LabPriority,
  LabStatus,
  RiskLevel,
  Species,
} from "../api/types";

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});
const timeFmt = new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit" });

/** Accepts ISO timestamps and `YYYY-MM-DD` dates (read as local calendar days). */
function toDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
}

export const formatDate = (v: string | Date | null | undefined) => (v ? dateFmt.format(toDate(v)) : "—");
export const formatDateTime = (v: string | Date | null | undefined) => (v ? dateTimeFmt.format(toDate(v)) : "—");
export const formatTime = (v: string | Date | null | undefined) => (v ? timeFmt.format(toDate(v)) : "—");

export function timeAgo(v: string | Date | null | undefined): string {
  if (!v) return "—";
  const seconds = Math.round((Date.now() - toDate(v).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(v);
}

/** Local calendar date as `YYYY-MM-DD`. */
export function isoDay(d = new Date()): string {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function isToday(v: string | Date): boolean {
  return isoDay(toDate(v)) === isoDay();
}

export function ageFrom(birthDate: string | null | undefined): string | null {
  if (!birthDate) return null;
  const months = Math.floor((Date.now() - toDate(birthDate).getTime()) / (30.44 * 24 * 3600 * 1000));
  if (months < 12) return `${Math.max(months, 0)} mo`;
  return `${Math.floor(months / 12)} yrs`;
}

export const SPECIES_LABEL: Record<Species, string> = {
  cattle: "Cattle",
  buffalo: "Buffalo",
  goat: "Goat",
  sheep: "Sheep",
  pig: "Pig",
  poultry: "Poultry",
  horse: "Horse",
  camel: "Camel",
  other: "Other",
};

export function speciesEmoji(species: string | null | undefined): string {
  switch (species) {
    case "cattle":
      return "🐄";
    case "buffalo":
      return "🐃";
    case "goat":
      return "🐐";
    case "sheep":
      return "🐑";
    case "pig":
      return "🐖";
    case "poultry":
      return "🐔";
    case "horse":
      return "🐴";
    case "camel":
      return "🐪";
    default:
      return "🐾";
  }
}

export const CASE_STATUS_LABEL: Record<CaseStatus, string> = {
  active: "Reported",
  under_review: "Under review",
  lab_pending: "Lab pending",
  treated: "Treated",
  resolved: "Resolved",
};

export const CASE_STATUS_STYLE: Record<CaseStatus, string> = {
  active: "bg-red-100 text-red-600",
  under_review: "bg-blue-100 text-blue-700",
  lab_pending: "bg-purple-100 text-purple-700",
  treated: "bg-amber-100 text-amber-700",
  resolved: "bg-green-100 text-green-700",
};

export const RISK_LABEL: Record<RiskLevel | "unassessed", string> = {
  high: "High",
  moderate: "Moderate",
  low: "Low",
  unassessed: "Not assessed",
};

export function riskKey(risk: RiskLevel | null | undefined): RiskLevel | "unassessed" {
  return risk ?? "unassessed";
}

/** Reuses the owner portal's severity classes (defined in index.css). */
export const RISK_STYLE: Record<RiskLevel | "unassessed", string> = {
  high: "bg-red-100 text-red-600",
  moderate: "bg-amber-100 text-amber-700",
  low: "bg-green-100 text-green-700",
  unassessed: "bg-gray-100 text-gray-600",
};

export const RISK_DOT: Record<RiskLevel | "unassessed", string> = {
  high: "bg-red-500",
  moderate: "bg-yellow-500",
  low: "bg-green-500",
  unassessed: "bg-gray-300",
};

export const ANIMAL_STATUS_LABEL: Record<AnimalStatus, string> = {
  healthy: "Healthy",
  sick: "Sick",
  under_treatment: "Under treatment",
  recovering: "Recovering",
  dead: "Dead",
  sold: "Sold",
};

export const ANIMAL_STATUS_STYLE: Record<AnimalStatus, { badge: string; border: string; dot: string; tile: string }> = {
  healthy: { badge: "bg-green-100 text-green-700", border: "border-green-200", dot: "bg-green-500", tile: "bg-green-100" },
  recovering: { badge: "bg-amber-100 text-amber-700", border: "border-amber-200", dot: "bg-amber-500", tile: "bg-amber-50" },
  under_treatment: { badge: "bg-blue-100 text-blue-700", border: "border-blue-200", dot: "bg-blue-500", tile: "bg-blue-50" },
  sick: { badge: "bg-red-100 text-red-600", border: "border-red-200", dot: "bg-red-500", tile: "bg-red-100" },
  dead: { badge: "bg-gray-200 text-gray-600", border: "border-gray-200", dot: "bg-gray-500", tile: "bg-gray-100" },
  sold: { badge: "bg-gray-100 text-gray-500", border: "border-gray-200", dot: "bg-gray-400", tile: "bg-gray-50" },
};

export const LAB_STATUS_LABEL: Record<LabStatus, string> = {
  requested: "Requested",
  collected: "Collected",
  received: "Received",
  processing: "Processing",
  completed: "Completed",
  rejected: "Rejected",
};

export const LAB_STATUS_STYLE: Record<LabStatus, string> = {
  requested: "bg-yellow-100 text-yellow-700",
  collected: "bg-yellow-100 text-yellow-700",
  received: "bg-sky-100 text-sky-700",
  processing: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  rejected: "bg-gray-200 text-gray-600",
};

export const LAB_PRIORITY_STYLE: Record<LabPriority, string> = {
  urgent: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  normal: "bg-blue-100 text-blue-700",
  routine: "bg-gray-100 text-gray-600",
};

/** Catalogue name for a disease code, falling back to the code in capitals. */
export function diseaseName(code: string | null | undefined, catalog?: Catalog): string {
  if (!code) return "Undiagnosed";
  return catalog?.diseases.find((d) => d.code === code)?.name ?? code.toUpperCase();
}

export function symptomLabel(code: string, catalog?: Catalog): string {
  return catalog?.symptoms.find((s) => s.code === code)?.name ?? code.replace(/_/g, " ");
}

export const LANGUAGES: { code: string; label: string; native: string }[] = [
  { code: "hi", label: "Hindi", native: "हिंदी" },
  { code: "en", label: "English", native: "English" },
  { code: "gu", label: "Gujarati", native: "ગુજરાતી" },
  { code: "mr", label: "Marathi", native: "मराठी" },
  { code: "pa", label: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "ta", label: "Tamil", native: "தமிழ்" },
  { code: "te", label: "Telugu", native: "తెలుగు" },
  { code: "bn", label: "Bengali", native: "বাংলা" },
];

export function greetingText(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export function greeting(): string {
  const h = new Date().getHours();
  return `${greetingText()} ${h < 12 ? "🌅" : h < 17 ? "☀️" : "🌙"}`;
}

/** Google Maps link for a point, when we have one. */
export function mapsLink(lat: number | null | undefined, lng: number | null | undefined): string | null {
  return lat != null && lng != null ? `https://www.google.com/maps?q=${lat},${lng}` : null;
}
