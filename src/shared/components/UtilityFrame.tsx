import { Link } from "react-router";
import type { ComponentType } from "react";
import { useAuth, homeFor } from "../../auth/AuthContext";
import { PORTALS } from "../../auth/portals";
import type { PortalId } from "../../auth/portals";

/**
 * Frame for the cross-cutting pages each portal ships (notifications, settings,
 * help) which sit outside that portal's role layouts. Gives them a header and,
 * critically, a way back into the portal they were opened from.
 */
export function utilityPage(Page: ComponentType, portal: PortalId) {
  return function UtilityPage() {
    const { session } = useAuth();
    const config = PORTALS[portal];
    const back = session ? homeFor(session) : config.roles[0].home;

    return (
      <div className="min-h-dvh bg-[#FAF9F6]">
        <header className="bg-white border-b border-[#E8E5DF] sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 rounded-lg focus-ring">
              <span className="text-2xl" aria-hidden="true">
                🐄
              </span>
              <span className="font-display font-bold text-[#1B4332]">PawVita</span>
            </Link>
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: config.accentSoft, color: config.accent }}
            >
              {config.name}
            </span>
            <Link
              to={back}
              className="ml-auto inline-flex items-center min-h-[44px] px-3 rounded-lg text-sm text-gray-600 hover:text-[#1B4332] hover:bg-[#FAF9F6] transition-colors focus-ring"
            >
              <span aria-hidden="true">←</span>&nbsp;Back to portal
            </Link>
          </div>
        </header>
        <main>
          <Page />
        </main>
      </div>
    );
  };
}
