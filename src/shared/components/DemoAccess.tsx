import { useState } from "react";
import { useNavigate } from "react-router";
import { ApiError, errorMessage } from "../../api/client";
import { useAuth, homeFor } from "../../auth/AuthContext";
import { DEMO_ACCOUNTS, DEMO_ENABLED, demoSignIn } from "../../auth/demo";
import type { Portal } from "../../auth/portals";

/**
 * One-click entry into every role in both portals, signing in as the seeded
 * demo accounts. Hidden unless demo access is enabled (see auth/demo.ts).
 */
export default function DemoAccess({ portals }: { portals: Portal[] }) {
  const navigate = useNavigate();
  const { completeSignIn } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!DEMO_ENABLED) return null;

  async function enter(portal: Portal, roleId: string) {
    setBusy(portal.id + roleId);
    setError(null);
    try {
      const result = await demoSignIn(portal.id, roleId);
      if (!result.user) throw new Error("This demo login has no PawVita account.");
      const session = completeSignIn(result.session, result.user, portal.id);
      navigate(homeFor(session));
    } catch (err) {
      setError(
        err instanceof ApiError && (err.status === 401 || err.code === "invalid_credentials")
          ? "Demo accounts not found. Run `npm run db:seed -- --demo` in server/ (with LOCAL_AUTH_FIXED_OTP=123456 for farmer logins)."
          : errorMessage(err),
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="mt-8 pt-6 border-t border-gray-100" aria-labelledby="demo-access-heading">
      <h2
        id="demo-access-heading"
        className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4"
      >
        Demo access — sign in as a demo user
      </h2>
      {error && (
        <p role="alert" className="mb-4 text-sm text-[#991B1B] bg-[#FEE2E2] border border-[#E63946]/30 rounded-xl px-3 py-2">
          {error}
        </p>
      )}
      <div className="space-y-4">
        {portals.map((portal) => (
          <div key={portal.id}>
            <p className="text-xs font-semibold text-gray-600 mb-2">{portal.name}</p>
            <div className="flex flex-wrap gap-2">
              {portal.roles
                .filter((role) => DEMO_ACCOUNTS[portal.id][role.id])
                .map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void enter(portal, role.id)}
                    className="min-h-[44px] px-3.5 rounded-xl border border-[#E8E5DF] bg-white text-xs font-semibold text-gray-700 hover:border-[#1B4332] hover:text-[#1B4332] transition-colors focus-ring disabled:opacity-50"
                  >
                    {busy === portal.id + role.id ? "Signing in…" : role.short}
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
