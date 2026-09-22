import type { AppNotification } from "../api/types";
import type { Session } from "../auth/AuthContext";

/** The screen a notification is about, for the signed-in role, if there is one. */
export function notificationLink(session: Pick<Session, "portal" | "role">, n: AppNotification): string | null {
  const caseId = typeof n.data.caseId === "string" ? n.data.caseId : null;
  const labRequestId = typeof n.data.labRequestId === "string" ? n.data.labRequestId : null;
  const { portal, role } = session;
  // The console has no case or herd screens, and an administrator cannot open
  // the portals that do, so only account notifications lead anywhere.
  if (portal === "admin") return n.type === "account" ? "/admin/users" : null;
  if (portal === "user") {
    if (role === "lab" && labRequestId) return `/user/lab/sample/${labRequestId}`;
    if (role === "vet" && caseId) return `/user/vet/case/${caseId}`;
    if ((role === "farmer" || role === "field_worker") && caseId) return `/user/farmer/case-status/${caseId}`;
    if (n.type === "vaccination_reminder") return "/user/farmer/vaccination-schedule";
    if (n.type === "visit" && role === "vet") return "/user/vet/field-visits";
  } else {
    if (role === "lab" && labRequestId) return `/hospital/lab/sample/${labRequestId}`;
    if (role === "doctor" && caseId) return `/hospital/doctor/case/${caseId}`;
    if (role === "ward" && caseId) return `/hospital/ward/case-status/${caseId}`;
    if (n.type === "vaccination_reminder") return "/hospital/ward/vaccination-schedule";
    if (n.type === "visit" && role === "doctor") return "/hospital/doctor/field-visits";
  }
  return null;
}

export const NOTIFICATION_ICON: Record<string, string> = {
  case_reported: "📋",
  case_status: "🔄",
  case_assigned: "🩺",
  advice: "💬",
  treatment: "💊",
  lab_request: "🧪",
  lab_result: "🔬",
  vaccination_reminder: "💉",
  visit: "🗓️",
  account: "👤",
  system: "🖥️",
};

/** Emphasis for the icon tile: urgent kinds red, reminders amber, the rest calm. */
export function notificationTone(type: string): "high" | "medium" | "low" {
  if (type === "case_reported" || type === "lab_result") return "high";
  if (type === "vaccination_reminder" || type === "case_assigned" || type === "visit") return "medium";
  return "low";
}
