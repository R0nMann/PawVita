import type { PortalId } from "../auth/portals";
import type { Account } from "./types";

/**
 * The signed-in session: tokens from Supabase Auth (via the API), the portal
 * the person signed in through, and their account as last seen from /me.
 *
 * Held in memory and mirrored to localStorage so a reload stays signed in.
 * Listeners are told about every change, including a failed token refresh.
 */
export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  /** Unix seconds. */
  expiresAt: number;
  portal: PortalId;
  account: Account;
}

const STORAGE_KEY = "pawvita.session";

type Listener = (session: StoredSession | null) => void;
const listeners = new Set<Listener>();

function read(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    // Sessions from the old front-end-only demo have no tokens; start signed out.
    if (!parsed.accessToken || !parsed.refreshToken || !parsed.account) return null;
    if (parsed.portal !== "user" && parsed.portal !== "hospital") return null;
    return parsed as StoredSession;
  } catch {
    return null;
  }
}

let current: StoredSession | null = read();

export function getSession(): StoredSession | null {
  return current;
}

export function setSession(next: StoredSession | null) {
  current = next;
  try {
    if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private browsing: the session still works for this tab.
  }
  for (const l of listeners) l(next);
}

export function updateSession(patch: Partial<StoredSession>) {
  if (current) setSession({ ...current, ...patch });
}

export function subscribeSession(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Keep tabs in step: signing out in one signs out the others.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;
    current = read();
    for (const l of listeners) l(current);
  });
}
