import path from "node:path";
import { z } from "zod";

/**
 * Runtime configuration, validated once at startup.
 *
 * Two modes:
 * - **Supabase** (staging / production): Postgres via DATABASE_URL, Supabase
 *   Auth for sign-in and Supabase Storage for photos and voice notes.
 * - **Local** (development / tests): embedded Postgres (PGlite), a fake auth
 *   provider that issues Supabase-shaped JWTs, and uploads on disk. Nothing
 *   needs to be installed or signed up for. Refused when NODE_ENV=production.
 */

const bool = z
  .enum(["true", "false", "1", "0"])
  .transform((v) => v === "true" || v === "1");

const csv = z
  .string()
  .transform((v) =>
    v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).optional(),
  CORS_ORIGINS: csv.default(["http://localhost:5173", "http://localhost:4173"]),
  /** API requests per minute per signed-in account (per IP when signed out). */
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(600),
  /** Default: on, except under NODE_ENV=test. */
  RATE_LIMITS_ENABLED: bool.optional(),
  /** Number of reverse proxies in front of the API, for correct client IPs in rate limiting. */
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),

  // Database -----------------------------------------------------------------
  /** Supabase Postgres connection string. Unset → embedded PGlite. */
  DATABASE_URL: z.string().url().optional(),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
  /** Set when connecting through Supavisor in transaction mode (port 6543). */
  DB_DISABLE_PREPARE: bool.default(false),
  PGLITE_DIR: z.string().default(".data/pglite"),
  /** Apply pending migrations on boot. Convenient for dev; run `db:migrate` in CI instead. */
  DB_MIGRATE_ON_START: bool.optional(),

  // Supabase -----------------------------------------------------------------
  SUPABASE_URL: z.string().url().optional(),
  /** Publishable key (sb_publishable_…) or legacy anon key. Used for sign-in calls. */
  SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  /** Secret key (sb_secret_…) or legacy service_role key. Used for admin + storage calls. */
  SUPABASE_SECRET_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  /** Only for projects still on the legacy HS256 JWT secret; asymmetric keys are read from JWKS. */
  SUPABASE_JWT_SECRET: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default("pawvita-uploads"),

  // Providers ----------------------------------------------------------------
  AUTH_PROVIDER: z.enum(["supabase", "local"]).optional(),
  STORAGE_PROVIDER: z.enum(["supabase", "local"]).optional(),
  LOCAL_STORAGE_DIR: z.string().default(".data/uploads"),
  LOCAL_AUTH_FILE: z.string().default(".data/local-auth.json"),
  LOCAL_AUTH_JWT_SECRET: z.string().min(32).default("local-dev-secret-change-me-0123456789abcdef"),
  /** When set, the local provider accepts this OTP for every phone number (demos, tests). */
  LOCAL_AUTH_FIXED_OTP: z.string().regex(/^\d{6}$/).optional(),

  // Two-factor sign-in + transactional email -----------------------------------
  /**
   * Staff sign-in asks for an emailed code after the password. Supabase Auth
   * generates and verifies that code, so this defaults on wherever the Supabase
   * auth provider is configured. Accounts flagged `two_factor_exempt` skip it.
   */
  TWO_FACTOR_ENABLED: bool.optional(),
  /**
   * Shared secret of the Supabase "Send Email" auth hook, as Supabase shows it
   * (`v1,whsec_…`). Required to accept POST /hooks/send-email.
   */
  EMAIL_HOOK_SECRET: z.string().optional(),
  /** Brevo transactional API key (Brevo → SMTP & API → API keys). */
  BREVO_API_KEY: z.string().optional(),
  /** Must be a sender verified in Brevo, or delivery is rejected. */
  BREVO_SENDER_EMAIL: z.string().email().optional(),
  BREVO_SENDER_NAME: z.string().default("PawVita"),

  // Features -----------------------------------------------------------------
  MAX_UPLOAD_MB: z.coerce.number().positive().max(50).default(15),
  /** Background jobs (vaccination and visit reminders). Disable on all but one instance if needed. */
  JOBS_ENABLED: bool.default(true),
  JOBS_INTERVAL_MINUTES: z.coerce.number().int().positive().default(60),
  REMINDER_LOOKAHEAD_DAYS: z.coerce.number().int().positive().default(7),
  /** Base URL of the future AI services. Unset → the AI hook is a no-op. */
  AI_SERVICE_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export interface Config {
  env: Env["NODE_ENV"];
  isProduction: boolean;
  host: string;
  port: number;
  logLevel: NonNullable<Env["LOG_LEVEL"]>;
  corsOrigins: string[];
  trustProxy: number;
  rateLimitPerMinute: number;
  rateLimitsEnabled: boolean;
  db:
    | { kind: "postgres"; url: string; poolMax: number; prepare: boolean }
    | { kind: "pglite"; dataDir: string | null };
  migrateOnStart: boolean;
  supabase: {
    url: string;
    publishableKey: string;
    secretKey: string;
    jwtSecret?: string;
    bucket: string;
  } | null;
  auth: { provider: "supabase" } | {
    provider: "local";
    file: string | null;
    jwtSecret: string;
    fixedOtp?: string;
  };
  storage: { provider: "supabase" } | { provider: "local"; dir: string };
  /** Emailed second factor on staff sign-in. */
  twoFactor: { enabled: boolean };
  email:
    | { provider: "brevo"; apiKey: string; senderEmail: string; senderName: string; hookSecret?: string }
    | { provider: "log"; hookSecret?: string };
  maxUploadBytes: number;
  jobs: { enabled: boolean; intervalMinutes: number; reminderLookaheadDays: number };
  aiServiceUrl?: string;
}

export class ConfigError extends Error {}

export function loadConfig(source: NodeJS.ProcessEnv = process.env): Config {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`);
    throw new ConfigError("Invalid environment configuration:\n" + lines.join("\n"));
  }
  const e = parsed.data;
  const isProduction = e.NODE_ENV === "production";
  const isTest = e.NODE_ENV === "test";

  const publishableKey = e.SUPABASE_PUBLISHABLE_KEY ?? e.SUPABASE_ANON_KEY;
  const secretKey = e.SUPABASE_SECRET_KEY ?? e.SUPABASE_SERVICE_ROLE_KEY;
  const supabase =
    e.SUPABASE_URL && publishableKey && secretKey
      ? {
          url: e.SUPABASE_URL.replace(/\/+$/, ""),
          publishableKey,
          secretKey,
          jwtSecret: e.SUPABASE_JWT_SECRET,
          bucket: e.SUPABASE_STORAGE_BUCKET,
        }
      : null;

  const authProvider = e.AUTH_PROVIDER ?? (supabase ? "supabase" : "local");
  const storageProvider = e.STORAGE_PROVIDER ?? (supabase ? "supabase" : "local");

  const problems: string[] = [];
  if ((authProvider === "supabase" || storageProvider === "supabase") && !supabase) {
    problems.push(
      "SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY (or SUPABASE_ANON_KEY) and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) are required for the Supabase providers.",
    );
  }
  const twoFactorEnabled = e.TWO_FACTOR_ENABLED ?? authProvider === "supabase";
  if (isProduction) {
    // Setting the hook secret takes delivery away from Supabase's own SMTP, so
    // from then on a transport of our own is required — otherwise Supabase would
    // hand us every code and we would only write it to the log. With no hook
    // secret Supabase sends the mail itself and nothing here is needed.
    if (e.EMAIL_HOOK_SECRET && !(e.BREVO_API_KEY && e.BREVO_SENDER_EMAIL)) {
      problems.push(
        "BREVO_API_KEY and BREVO_SENDER_EMAIL are required once EMAIL_HOOK_SECRET is set, or sign-in codes would only be logged.",
      );
    }
    if (!e.DATABASE_URL) problems.push("DATABASE_URL is required in production.");
    if (authProvider !== "supabase") problems.push("AUTH_PROVIDER=local is not allowed in production.");
    if (storageProvider !== "supabase") problems.push("STORAGE_PROVIDER=local is not allowed in production.");
  }
  if (problems.length) throw new ConfigError(problems.join("\n"));

  return {
    env: e.NODE_ENV,
    isProduction,
    host: e.HOST,
    port: e.PORT,
    logLevel: e.LOG_LEVEL ?? (isTest ? "silent" : isProduction ? "info" : "debug"),
    corsOrigins: e.CORS_ORIGINS,
    trustProxy: e.TRUST_PROXY,
    rateLimitPerMinute: e.RATE_LIMIT_PER_MINUTE,
    rateLimitsEnabled: e.RATE_LIMITS_ENABLED ?? !isTest,
    db: e.DATABASE_URL
      ? { kind: "postgres", url: e.DATABASE_URL, poolMax: e.DB_POOL_MAX, prepare: !e.DB_DISABLE_PREPARE }
      : { kind: "pglite", dataDir: isTest ? null : path.resolve(e.PGLITE_DIR) },
    migrateOnStart: e.DB_MIGRATE_ON_START ?? !isProduction,
    supabase,
    auth:
      authProvider === "supabase"
        ? { provider: "supabase" }
        : {
            provider: "local",
            file: isTest ? null : path.resolve(e.LOCAL_AUTH_FILE),
            jwtSecret: e.LOCAL_AUTH_JWT_SECRET,
            fixedOtp: e.LOCAL_AUTH_FIXED_OTP,
          },
    storage:
      storageProvider === "supabase"
        ? { provider: "supabase" }
        : { provider: "local", dir: path.resolve(e.LOCAL_STORAGE_DIR) },
    twoFactor: { enabled: twoFactorEnabled },
    email:
      e.BREVO_API_KEY && e.BREVO_SENDER_EMAIL
        ? {
            provider: "brevo",
            apiKey: e.BREVO_API_KEY,
            senderEmail: e.BREVO_SENDER_EMAIL,
            senderName: e.BREVO_SENDER_NAME,
            hookSecret: e.EMAIL_HOOK_SECRET,
          }
        : { provider: "log", hookSecret: e.EMAIL_HOOK_SECRET },
    maxUploadBytes: Math.round(e.MAX_UPLOAD_MB * 1024 * 1024),
    jobs: {
      enabled: e.JOBS_ENABLED && !isTest,
      intervalMinutes: e.JOBS_INTERVAL_MINUTES,
      reminderLookaheadDays: e.REMINDER_LOOKAHEAD_DAYS,
    },
    aiServiceUrl: e.AI_SERVICE_URL,
  };
}
