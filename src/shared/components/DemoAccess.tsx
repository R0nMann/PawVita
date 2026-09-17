import { useNavigate } from "react-router";
import { useAuth } from "../../auth/AuthContext";
import type { Portal } from "../../auth/portals";

/**
 * One-click entry into every role in both portals.
 *
 * Deliberately visible rather than hidden behind a key combination: a reviewer
 * opening this build needs to reach all ten dashboards without credentials.
 */
export default function DemoAccess({ portals }: { portals: Portal[] }) {
  const navigate = useNavigate();
  const { signIn } = useAuth();

  return (
    <section className="mt-8 pt-6 border-t border-gray-100" aria-labelledby="demo-access-heading">
      <h2
        id="demo-access-heading"
        className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4"
      >
        Demo access — skip sign-in
      </h2>
      <div className="space-y-4">
        {portals.map((portal) => (
          <div key={portal.id}>
            <p className="text-xs font-semibold text-gray-600 mb-2">{portal.name}</p>
            <div className="flex flex-wrap gap-2">
              {portal.roles.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => {
                    signIn({
                      portal: portal.id,
                      role: role.id,
                      name: role.label,
                      identifier: "demo",
                    });
                    navigate(role.home);
                  }}
                  className="min-h-[44px] px-3.5 rounded-xl border border-[#E8E5DF] bg-white text-xs font-semibold text-gray-700 hover:border-[#1B4332] hover:text-[#1B4332] transition-colors focus-ring"
                >
                  {role.short}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
