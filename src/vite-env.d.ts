/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** API origin, e.g. https://api.pawvita.in. Empty → same origin (the dev proxy). */
  readonly VITE_API_URL?: string;
  /** "true" shows the one-click demo sign-in panel. On by default in development. */
  readonly VITE_DEMO_ACCESS?: string;
  /** OTP the demo farmer accounts accept (LOCAL_AUTH_FIXED_OTP or a Supabase test number). */
  readonly VITE_DEMO_OTP?: string;
  /** Password of the seeded demo staff accounts. */
  readonly VITE_DEMO_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
