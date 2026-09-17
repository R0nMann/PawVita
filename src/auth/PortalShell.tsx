import { Suspense, useEffect } from "react";
import { Link, Navigate, Outlet, useLocation } from "react-router";
import { useAuth, homeFor } from "./AuthContext";
import { PORTALS } from "./portals";
import type { PortalId } from "./portals";
import { IconArrowRight, IconShield } from "../shared/components/Icons";

/**
 * Wraps one of the two merged applications.
 *
 * Two jobs:
 *  1. Gate the portal behind a session for the matching portal.
 *  2. Tag <html data-portal="..."> so the portal-scoped rules in index.css
 *     (the two apps ship colliding `.sidebar-link` and table styles) apply to
 *     the right tree without either app's CSS leaking into the other.
 */
export default function PortalShell({ portal }: { portal: PortalId }) {
  const { session } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const root = document.documentElement;
    const previous = root.dataset.portal;
    root.dataset.portal = portal;
    return () => {
      if (previous) root.dataset.portal = previous;
      else delete root.dataset.portal;
    };
  }, [portal]);

  if (!session) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?portal=${portal}&next=${next}`} replace />;
  }

  if (session.portal !== portal) {
    return <WrongPortal requested={portal} />;
  }

  return (
    <Suspense fallback={<PortalLoading portal={portal} />}>
      <Outlet />
    </Suspense>
  );
}

/**
 * Shown while a portal's chunk downloads. Sized and coloured like the portal it
 * is standing in for so entering one does not flash a blank white page.
 */
function PortalLoading({ portal }: { portal: PortalId }) {
  const config = PORTALS[portal];
  return (
    <div className="min-h-dvh grid place-items-center bg-[#FAF9F6] px-4" aria-busy="true">
      <p className="flex items-center gap-3 text-sm text-gray-600">
        <span
          className="w-8 h-8 rounded-xl grid place-items-center motion-safe:animate-pulse"
          style={{ background: config.accentSoft, color: config.accent }}
          aria-hidden="true"
        >
          <IconShield />
        </span>
        Opening the {config.name} portal…
      </p>
    </div>
  );
}

/**
 * Signed in, but to the other portal. A silent redirect here reads as a broken
 * link, so explain the mismatch and offer both ways out.
 */
function WrongPortal({ requested }: { requested: PortalId }) {
  const { session } = useAuth();
  const wanted = PORTALS[requested];
  const current = session ? PORTALS[session.portal] : null;

  return (
    <div className="min-h-dvh grid place-items-center bg-[#FAF9F6] px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-3xl border border-[#E8E5DF] shadow-sm p-8 text-center">
        <span
          className="w-14 h-14 rounded-2xl bg-[#E8F1EC] text-[#1B4332] grid place-items-center text-2xl mx-auto mb-5"
          aria-hidden="true"
        >
          <IconShield />
        </span>
        <h1 className="text-xl font-display font-bold text-[#1B4332]">
          That page belongs to the {wanted.name} portal
        </h1>
        <p className="text-sm text-gray-600 mt-2 leading-relaxed">
          {current
            ? `You are signed in to the ${current.name} portal. Sign out to switch, or carry on where you left off.`
            : "Sign in to continue."}
        </p>
        <div className="mt-6 grid gap-3">
          {session && (
            <Link
              to={homeFor(session)}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-xl bg-[#1B4332] text-white font-semibold font-display hover:bg-[#2D6A4F] transition-colors focus-ring"
            >
              Back to my portal <IconArrowRight />
            </Link>
          )}
          <Link
            to="/logout"
            className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-xl border border-[#E8E5DF] text-[#1B4332] font-semibold hover:bg-[#FAF9F6] transition-colors focus-ring"
          >
            Sign out and switch portal
          </Link>
        </div>
      </div>
    </div>
  );
}
