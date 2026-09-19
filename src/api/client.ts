import { API_ORIGIN, API_PREFIX } from "./config";
import { getSession, setSession, updateSession } from "./session";

/** An error response from the API, or a request that never reached it. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }

  /** The request could not be sent — offline, DNS failure, server down. */
  get isNetwork() {
    return this.status === 0;
  }
}

export type QueryValue = string | number | boolean | null | undefined | (string | number)[];

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  query?: Record<string, QueryValue>;
  body?: unknown;
  form?: FormData;
  /** Send the bearer token (default). Public endpoints pass false. */
  auth?: boolean;
  /** Use this token instead of the session's — e.g. registering right after OTP verification. */
  token?: string;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: Record<string, QueryValue>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      if (value.length) params.set(key, value.join(","));
    } else {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return `${API_ORIGIN}${API_PREFIX}${path}${qs ? `?${qs}` : ""}`;
}

async function parseError(res: Response): Promise<ApiError> {
  try {
    const body = (await res.json()) as { error?: { code?: string; message?: string; details?: unknown } };
    if (body.error) {
      return new ApiError(res.status, body.error.code ?? "error", body.error.message ?? res.statusText, body.error.details);
    }
  } catch {
    // Not JSON — fall through.
  }
  return new ApiError(res.status, "error", res.statusText || "Request failed");
}

let refreshing: Promise<boolean> | null = null;

/**
 * Swap the refresh token for a new session. Concurrent callers share one
 * refresh: Supabase rotates refresh tokens, so a second use would fail.
 */
export function refreshSession(): Promise<boolean> {
  if (refreshing) return refreshing;
  const session = getSession();
  if (!session) return Promise.resolve(false);
  refreshing = (async () => {
    try {
      const res = await fetch(buildUrl("/auth/refresh"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      });
      if (!res.ok) {
        // A rejected refresh token means the session is over; a server error might not.
        if (res.status === 400 || res.status === 401) setSession(null);
        return false;
      }
      const { session: next } = (await res.json()) as {
        session: { accessToken: string; refreshToken: string; expiresAt: number };
      };
      updateSession(next);
      return true;
    } catch {
      return false; // Offline: keep the session and try again later.
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const useAuth = options.auth !== false;

  // Refresh a token that is about to expire rather than waiting for a 401.
  const before = getSession();
  if (useAuth && before && before.expiresAt * 1000 - Date.now() < 30_000) await refreshSession();

  const send = async () => {
    const headers: Record<string, string> = { Accept: "application/json" };
    const token = options.token ?? getSession()?.accessToken;
    if (useAuth && token) headers.Authorization = `Bearer ${token}`;
    let body: BodyInit | undefined;
    if (options.form) {
      body = options.form;
    } else if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(options.body);
    }
    try {
      return await fetch(buildUrl(path, options.query), {
        method: options.method ?? (body ? "POST" : "GET"),
        headers,
        body,
        signal: options.signal,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      throw new ApiError(0, "network_error", "Can't reach PawVita. Check your connection.");
    }
  };

  let res = await send();
  if (res.status === 401 && useAuth && !options.token && getSession()) {
    if (await refreshSession()) res = await send();
  }
  if (!res.ok) {
    const error = await parseError(res);
    if (res.status === 401 && useAuth && !options.token) setSession(null);
    throw error;
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** A readable message for any thrown value — for toasts and inline errors. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const details = err.details;
    if (Array.isArray(details) && details.length && typeof details[0]?.message === "string") {
      return details.map((d: { message: string }) => d.message).join(" ");
    }
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}
