import { useEffect, useState } from "react";
import { Navigate } from "react-router";
import { useAuth } from "../../auth/AuthContext";

/**
 * Ends the session (on the server too), then bounces to the sign-in screen.
 *
 * A route rather than an inline handler so every "log out" control in both
 * portals ends up in the same place.
 */
export default function Logout() {
  const { signOut } = useAuth();
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void signOut().finally(() => {
      // Also drop the portal tag so the next screen renders with public styling.
      delete document.documentElement.dataset.portal;
      if (!cancelled) setDone(true);
    });
    return () => {
      cancelled = true;
    };
  }, [signOut]);

  if (!done) {
    return (
      <div className="min-h-dvh grid place-items-center bg-[#FAF9F6]" aria-busy="true">
        <p className="text-sm text-gray-500">Signing you out…</p>
      </div>
    );
  }

  return <Navigate to="/login" replace />;
}
