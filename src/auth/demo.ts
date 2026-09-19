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

export const DEMO_OTP = import.meta.env.VITE_DEMO_OTP || "123456";
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD || "PawVita@2026";

type DemoLogin = { phone: string } | { login: string };

export const DEMO_ACCOUNTS: Record<PortalId, Record<string, DemoLogin>> = {
  user: {
    farmer: { phone: "9876543210" },
    field_worker: { phone: "9876543216" },
    vet: { login: "dr.meera" },
    official: { login: "ahd-gujarat" },
    lab: { login: "lab-anand-01" },
    admin: { login: "admin" },
  },
  hospital: {
    ward: { login: "vh-anand-01" },
    doctor: { login: "dr.meera" },
    official: { login: "ahd-gujarat" },
    lab: { login: "lab-anand-01" },
    admin: { login: "admin" },
  },
};

export async function demoSignIn(portal: PortalId, roleId: string): Promise<SignInResult> {
  const account = DEMO_ACCOUNTS[portal][roleId];
  if (!account) throw new Error("No demo account for this role.");
  if ("phone" in account) {
    await authApi.requestOtp(account.phone);
    return authApi.verifyOtp(account.phone, DEMO_OTP);
  }
  return authApi.login(account.login, DEMO_PASSWORD);
}
