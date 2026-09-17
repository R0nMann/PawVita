import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { PORTALS, roleFor } from "./portals";
import type { PortalId } from "./portals";

export interface Session {
  portal: PortalId;
  /** Role id within the portal — see PORTALS[portal].roles. */
  role: string;
  name: string;
  /** Mobile number (user portal) or institution id / email (hospital portal). */
  identifier: string;
  district?: string;
  language?: string;
  signedInAt: number;
}

interface AuthValue {
  session: Session | null;
  signIn: (session: Omit<Session, "signedInAt">) => Session;
  signOut: () => void;
}

const STORAGE_KEY = "pashurakshak.session";

const AuthContext = createContext<AuthValue | null>(null);

function readStoredSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Session>;
    if (parsed.portal !== "user" && parsed.portal !== "hospital") return null;
    if (typeof parsed.role !== "string") return null;
    return {
      portal: parsed.portal,
      role: parsed.role,
      name: parsed.name ?? "Guest",
      identifier: parsed.identifier ?? "",
      district: parsed.district,
      language: parsed.language,
      signedInAt: parsed.signedInAt ?? Date.now(),
    };
  } catch {
    // Private browsing, cleared storage or corrupt JSON — start signed out.
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Read storage during the first render so guarded routes never flash a
  // loading state (or a redirect to /login) before the session is known.
  const [session, setSession] = useState<Session | null>(readStoredSession);

  // Keep this tab in step when the session changes in another tab.
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY) return;
      setSession(readStoredSession());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const signIn = useCallback((next: Omit<Session, "signedInAt">) => {
    const full: Session = { ...next, signedInAt: Date.now() };
    setSession(full);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
    } catch {
      // Session still works for this tab even if it cannot be persisted.
    }
    return full;
  }, []);

  const signOut = useCallback(() => {
    setSession(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing to clean up if storage is unavailable.
    }
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ session, signIn, signOut }),
    [session, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** Where a signed-in session should land. */
export function homeFor(session: Session): string {
  return roleFor(session.portal, session.role).home;
}

/** Human-readable label for the session's role, e.g. for headers and badges. */
export function roleLabelFor(session: Session): string {
  return roleFor(session.portal, session.role).label;
}

export function portalFor(session: Session) {
  return PORTALS[session.portal];
}
