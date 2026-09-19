/**
 * The two entry points a visitor chooses between on the login / register screen.
 *
 * `user`     -> PawVita_Users  (village-level: livestock owners and the field
 *               network that serves them)
 * `hospital` -> PawVita_Hospital (institutional: veterinary hospitals, labs and
 *               the government officials supervising them)
 *
 * Every route inside a portal is namespaced under its `basePath`, which is how
 * the two originally-separate applications now coexist in one router.
 *
 * The API has one role set for both portals; each portal role below names the
 * account role it presents (`backendRole`). A vet who signs in through the
 * Livestock Owner portal gets the field vet screens, and through the hospital
 * portal the doctor screens — same account, same cases.
 */
import type { BackendRole } from "../api/types";

export type PortalId = "user" | "hospital";

export interface PortalRole {
  id: string;
  label: string;
  /** Compact form for chips and buttons where the full label would wrap. */
  short: string;
  /** Who this role is for, shown under the label in the role picker. */
  desc: string;
  /** Landing route after a successful sign-in. */
  home: string;
  /** The account role in the API that this portal role presents. */
  backendRole: BackendRole;
  /** Offered on the registration form (administrators are created by other administrators). */
  selfService: boolean;
}

export interface Portal {
  id: PortalId;
  /** Short name used in buttons and badges. */
  name: string;
  /** Full name used in headings. */
  title: string;
  tagline: string;
  basePath: string;
  /** Accent colour for the portal, used for badges and selected states. */
  accent: string;
  accentSoft: string;
  /** How this portal authenticates — farmers get OTP, institutions get credentials. */
  authMethod: "otp" | "credentials";
  roles: PortalRole[];
  highlights: string[];
}

export const PORTALS: Record<PortalId, Portal> = {
  user: {
    id: "user",
    name: "Livestock Owner",
    title: "Livestock Owner Portal",
    tagline: "Report symptoms, track your herd, and get alerts in your language.",
    basePath: "/user",
    accent: "#1B4332",
    accentSoft: "#E8F1EC",
    authMethod: "otp",
    roles: [
      {
        id: "farmer",
        label: "Farmer / Livestock Owner",
        short: "Farmer",
        desc: "Report disease, track animals, receive alerts",
        home: "/user/farmer/home",
        backendRole: "farmer",
        selfService: true,
      },
      {
        id: "field_worker",
        label: "Field Worker / Pashu Sakhi",
        short: "Field Worker",
        desc: "Register herds and report cases for farmers in your area",
        home: "/user/farmer/home",
        backendRole: "field_worker",
        selfService: true,
      },
      {
        id: "vet",
        label: "Veterinary Officer",
        short: "Veterinarian",
        desc: "Manage cases, log treatments, plan field visits",
        home: "/user/vet/dashboard",
        backendRole: "vet",
        selfService: true,
      },
      {
        id: "official",
        label: "Government / District Official",
        short: "Official",
        desc: "Monitor outbreaks, generate policy reports",
        home: "/user/official/overview",
        backendRole: "official",
        selfService: true,
      },
      {
        id: "lab",
        label: "Lab Technician",
        short: "Lab Tech",
        desc: "Process samples, enter diagnostic results",
        home: "/user/lab/queue",
        backendRole: "lab_tech",
        selfService: true,
      },
      {
        id: "admin",
        label: "System Administrator",
        short: "Admin",
        desc: "Manage users, regions and platform health",
        home: "/user/admin/users",
        backendRole: "admin",
        selfService: false,
      },
    ],
    highlights: [
      "Icon-based symptom reporting in 22 languages",
      "Offline-first — reports sync when you regain signal",
      "Herd health cards and vaccination reminders",
    ],
  },
  hospital: {
    id: "hospital",
    name: "Veterinary Hospital",
    title: "Veterinary Hospital Portal",
    tagline: "Run wards, triage referrals, and coordinate district-level response.",
    basePath: "/hospital",
    accent: "#4A90D9",
    accentSoft: "#E7F0FA",
    authMethod: "credentials",
    roles: [
      {
        id: "ward",
        label: "Hospital Ward",
        short: "Ward",
        desc: "Ward managers and animal care staff",
        home: "/hospital/ward/home",
        backendRole: "ward_staff",
        selfService: true,
      },
      {
        id: "doctor",
        label: "Veterinarian",
        short: "Veterinarian",
        desc: "Field and hospital veterinary officers",
        home: "/hospital/doctor/dashboard",
        backendRole: "vet",
        selfService: true,
      },
      {
        id: "official",
        label: "Government Official",
        short: "Official",
        desc: "District and state level directors",
        home: "/hospital/official/overview",
        backendRole: "official",
        selfService: true,
      },
      {
        id: "lab",
        label: "Lab Technician",
        short: "Lab Tech",
        desc: "Diagnostic laboratory staff",
        home: "/hospital/lab/queue",
        backendRole: "lab_tech",
        selfService: true,
      },
      {
        id: "admin",
        label: "System Administrator",
        short: "Admin",
        desc: "Platform administrators",
        home: "/hospital/admin/users",
        backendRole: "admin",
        selfService: false,
      },
    ],
    highlights: [
      "Digital ward view with live admission status",
      "Sample collection, lab referral and case escalation",
      "District risk maps and outbreak cluster detection",
    ],
  },
};

export const PORTAL_LIST: Portal[] = [PORTALS.user, PORTALS.hospital];

/** Resolve the portal that owns a given pathname, if any. */
export function portalForPath(pathname: string): PortalId | null {
  if (pathname === "/user" || pathname.startsWith("/user/")) return "user";
  if (pathname === "/hospital" || pathname.startsWith("/hospital/")) return "hospital";
  return null;
}

export function roleFor(portal: PortalId, roleId: string): PortalRole {
  const found = PORTALS[portal].roles.find((r) => r.id === roleId);
  return found ?? PORTALS[portal].roles[0];
}

/** The area segment of a role's screens: "/user/vet/dashboard" → "vet". */
function areaOf(role: PortalRole): string {
  return role.home.split("/")[2] ?? "";
}

/** Shared pages every signed-in user of a portal may open. */
const UTILITY_AREAS = ["notifications", "settings", "help-support"];

/**
 * Whether a role may open a path inside its portal. Each role has its own
 * area; vets can also work the lab queue, and administrators can go anywhere.
 */
export function canOpen(portal: PortalId, roleId: string, pathname: string): boolean {
  const area = pathname.split("/")[2];
  if (!area || UTILITY_AREAS.includes(area)) return true;
  const role = roleFor(portal, roleId);
  if (role.backendRole === "admin") return true;
  const allowed = [areaOf(role), ...(role.backendRole === "vet" ? ["lab"] : [])];
  return allowed.includes(area);
}

/**
 * Where an account lands. The portal chosen at sign-in wins when it has a
 * screen for the account's role; otherwise the other portal does (ward staff
 * only exist in the hospital portal, farmers only in the owner portal).
 */
export function portalRoleFor(backendRole: BackendRole, preferred: PortalId): { portal: PortalId; role: PortalRole } {
  const order: PortalId[] = preferred === "user" ? ["user", "hospital"] : ["hospital", "user"];
  for (const portal of order) {
    const role = PORTALS[portal].roles.find((r) => r.backendRole === backendRole);
    if (role) return { portal, role };
  }
  return { portal: preferred, role: PORTALS[preferred].roles[0] };
}
