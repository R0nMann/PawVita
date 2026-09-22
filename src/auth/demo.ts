import { authApi } from "../api/endpoints";
import type { SignInResult } from "../api/types";
import type { PortalId } from "./portals";

/**
 * One-click demo sign-in: each dashboard button signs in as the matching
 * account from the API's demo seed (`npm run db:seed -- --demo` in server/).
 * On in development; set VITE_DEMO_ACCESS=true to show it in a build.
 */
export const DEMO_ENABLED =
  import.meta.env.VITE_DEMO_ACCESS !== undefined ? import.meta.env.VITE_DEMO_ACCESS === "true" : import.meta.env.DEV;

const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD || "PawVita@2026";

/** Every demo account signs in with an email or a staff ID, plus the password. */
type DemoLogin = { login: string };

/**
 * Portals with a one-click demo login. The administration console is left out
 * deliberately: it is not a role to look around in.
 */
export const DEMO_ACCOUNTS: Partial<Record<PortalId, Record<string, DemoLogin>>> = {
  user: {
    farmer: { login: "ramesh.kumar@demo.pawvita.in" },
    field_worker: { login: "kiran.patel@demo.pawvita.in" },
    vet: { login: "dr.meera" },
    official: { login: "ahd-gujarat" },
    lab: { login: "lab-anand-01" },
  },
  hospital: {
    ward: { login: "vh-anand-01" },
    doctor: { login: "dr.meera" },
    official: { login: "ahd-gujarat" },
    lab: { login: "lab-anand-01" },
  },
};

export async function demoSignIn(portal: PortalId, roleId: string): Promise<SignInResult> {
  const account = DEMO_ACCOUNTS[portal]?.[roleId];
  if (!account) throw new Error("No demo account for this role.");
  const result = await authApi.login(account.login, DEMO_PASSWORD);
  if (result.twoFactorRequired) {
    // The seeded demo accounts are two_factor_exempt, so this only happens if
    // the data was loaded some other way — say so rather than hang on a code.
    throw new Error("This demo account is not exempt from two-factor sign-in. Reseed the demo data, or sign in normally.");
  }
  return result;
}
