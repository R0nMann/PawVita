import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { authApi } from "../api/endpoints";
import { clearCachedData } from "../api/queryClient";
import { getSession, setSession, subscribeSession, updateSession, type StoredSession } from "../api/session";
import type { Account, AuthTokens } from "../api/types";
import { PORTALS, portalRoleFor, roleFor } from "./portals";
import type { PortalId } from "./portals";

/**
 * The signed-in person as the UI sees them. `portal` and `role` pick the
 * screens; `account` is the real account from the API.
 */
export interface Session {
  portal: PortalId;
  /** Role id within the portal — see PORTALS[portal].roles. */
  role: string;
  name: string;
  /** Mobile number, email or staff ID. */
  identifier: string;
  /** "Vadod, Anand" — the account's village/area for headers. */
  district?: string;
  language?: string;
  account: Account;
}

interface AuthValue {
  session: Session | null;
  /** Store a new session after sign-in or registration; returns where to go. */
  completeSignIn: (tokens: AuthTokens, account: Account, portal: PortalId) => Session;
  /** Re-read the account (after approval, a profile edit, …). */
  refreshAccount: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

/** "Vadod, Anand" from a region path (village and district, most specific first). */
export function placeName(account: Account): string | undefined {
  const path = account.region?.path ?? [];
  const names = path.filter((p) => p.level !== "state").map((p) => p.name);
  const unique = names.filter((n, i) => names.indexOf(n) === i);
  return unique.reverse().slice(0, 2).join(", ") || account.region?.name;
}

function toSession(stored: StoredSession | null): Session | null {
  if (!stored) return null;
  const { account } = stored;
  const { portal, role } = portalRoleFor(account.role, stored.portal);
  return {
    portal,
    role: role.id,
    name: account.fullName,
    identifier: account.phone ?? account.email ?? account.username ?? "",
    district: placeName(account),
    language: account.preferredLanguage,
    account,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Read storage during the first render so guarded routes never flash a
  // loading state (or a redirect to /login) before the session is known.
  const [stored, setStored] = useState<StoredSession | null>(getSession);
  const accountId = useRef(stored?.account.id);

  // Token refreshes, sign-outs (here or in another tab) and expired sessions
  // all arrive through the session store. Whenever the person changes, drop
  // the cached data so the next person never sees the previous one's records.
  useEffect(
    () =>
      subscribeSession((next) => {
        if (accountId.current && accountId.current !== next?.account.id) void clearCachedData();
        accountId.current = next?.account.id;
        setStored(next);
      }),
    [],
  );

  const refreshAccount = useCallback(async () => {
    if (!getSession()) return;
    try {
      const { user } = await authApi.me();
      if (user) updateSession({ account: user });
    } catch {
      // Offline or expired — the client has already handled an expired session.
    }
  }, []);

  // Pick up changes made elsewhere (an admin approving the account, a new role).
  useEffect(() => {
    void refreshAccount();
  }, [refreshAccount]);

  const completeSignIn = useCallback((tokens: AuthTokens, account: Account, preferred: PortalId) => {
    const { portal } = portalRoleFor(account.role, preferred);
    const next: StoredSession = { ...tokens, portal, account };
    setSession(next);
    return toSession(next)!;
  }, []);

  const signOut = useCallback(async () => {
    if (getSession()) await authApi.logout().catch(() => {});
    setSession(null);
    await clearCachedData();
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ session: toSession(stored), completeSignIn, refreshAccount, signOut }),
    [stored, completeSignIn, refreshAccount, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** The signed-in session inside a portal (PortalShell guarantees one). */
export function useSession(): Session {
  const { session } = useAuth();
  if (!session) throw new Error("useSession must be used inside a signed-in portal");
  return session;
}

/** Where a signed-in session should land. */
export function homeFor(session: Pick<Session, "portal" | "role">): string {
  return roleFor(session.portal, session.role).home;
}

/** Human-readable label for the session's role, e.g. for headers and badges. */
export function roleLabelFor(session: Pick<Session, "portal" | "role">): string {
  return roleFor(session.portal, session.role).label;
}

export function portalFor(session: Pick<Session, "portal">) {
  return PORTALS[session.portal];
}
