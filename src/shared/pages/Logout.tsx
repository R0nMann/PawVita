import { useEffect, useState } from "react";
import { Navigate } from "react-router";
import { useAuth } from "../../auth/AuthContext";

/**
 * Clears the session, then bounces to the sign-in screen.
 *
 * A route rather than an inline handler so every "log out" control in both
 * portals — which used to navigate to /login and leave the session intact — ends
 * up in the same place.
 */
export default function Logout() {
  const { signOut } = useAuth();
  const [done, setDone] = useState(false);

  useEffect(() => {
    signOut();
    // Also drop the portal tag so the next screen renders with public styling.
    delete document.documentElement.dataset.portal;
    setDone(true);
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
