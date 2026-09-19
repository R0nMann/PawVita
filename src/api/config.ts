/**
 * Where the PawVita API lives.
 *
 * Leave VITE_API_URL empty in development: Vite proxies /api to the local
 * server (see vite.config.ts), so the app and API share an origin. Set it to
 * the API's origin (e.g. https://api.pawvita.in) for a separately hosted API.
 */
export const API_ORIGIN = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");
export const API_PREFIX = "/api/v1";

/**
 * File links from the API are absolute for Supabase Storage and relative to
 * the API origin for local storage; this makes either usable in <img src>.
 */
export function resolveApiUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//.test(url)) return url;
  return `${API_ORIGIN}${url}`;
}
