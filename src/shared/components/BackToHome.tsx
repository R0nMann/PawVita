import { Link, useLocation } from "react-router";
import { useAuth, homeFor } from "../../auth/AuthContext";

/**
 * "← Home" for any screen that is not the signed-in role's home.
 *
 * Rendered once per layout rather than per page, so every screen below a role
 * home has a way back and new ones get it without being remembered. It goes to
 * a fixed destination, unlike the `navigate(-1)` controls on detail screens —
 * those return to the list you came from, which is a different intent and is
 * why both can appear together.
 */
export default function BackToHome({ className = "" }: { className?: string }) {
  const { session } = useAuth();
  const location = useLocation();
  if (!session) return null;

  const home = homeFor(session);
  // The home screen itself needs no way back to itself.
  if (location.pathname === home || location.pathname === home.replace(/\/[^/]+$/, "")) return null;

  return (
    <Link
      to={home}
      className={`inline-flex items-center gap-1.5 min-h-[44px] text-sm font-medium text-gray-600 hover:text-[#1B4332] transition-colors rounded focus-ring ${className}`}
    >
      <span aria-hidden="true">←</span> Home
    </Link>
  );
}
