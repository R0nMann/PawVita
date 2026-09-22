import { pino, type Logger } from "pino";
import { NoopAiService, type AiService } from "./ai/index.js";
import { LocalAuthProvider } from "./auth/local.js";
import type { AuthProvider } from "./auth/provider.js";
import { SupabaseAuthProvider } from "./auth/supabase.js";
import type { Config } from "./config.js";
import { createDatabase, type Database } from "./db/client.js";
import { createEmailProvider, type EmailProvider } from "./email/index.js";
import type { Deps } from "./deps.js";
import { LocalStorage, SupabaseStorage, type StorageProvider } from "./storage/index.js";

export function createLogger(config: Config): Logger {
  return pino({
    level: config.logLevel,
    ...(config.env === "development" && {
      transport: { target: "pino-pretty", options: { translateTime: "SYS:HH:MM:ss", ignore: "pid,hostname" } },
    }),
  });
}

export function createAuthProvider(config: Config, logger: Logger): AuthProvider {
  if (config.auth.provider === "supabase") return new SupabaseAuthProvider(config.supabase!);
  logger.warn("Using the LOCAL auth provider — for development only. Sign-in codes are printed to this log.");
  return new LocalAuthProvider({
    jwtSecret: config.auth.jwtSecret,
    file: config.auth.file,
    fixedOtp: config.auth.fixedOtp,
    onOtp: (email, otp) => logger.warn({ email, otp }, "Sign-in code (local auth — not actually emailed)"),
  });
}

export function createStorage(config: Config): StorageProvider {
  if (config.storage.provider === "supabase") {
    return new SupabaseStorage(config.supabase!.url, config.supabase!.secretKey, config.supabase!.bucket);
  }
  return new LocalStorage(config.storage.dir);
}

/** Build every dependency from config. Tests pass overrides for the parts they fake. */
export async function createDeps(
  config: Config,
  overrides: {
    logger?: Logger;
    database?: Database;
    auth?: AuthProvider;
    storage?: StorageProvider;
    email?: EmailProvider;
    ai?: AiService;
  } = {},
): Promise<Deps> {
  const logger = overrides.logger ?? createLogger(config);
  const database = overrides.database ?? (await createDatabase(config.db));
  return {
    config,
    logger,
    database,
    db: database.db,
    auth: overrides.auth ?? createAuthProvider(config, logger),
    storage: overrides.storage ?? createStorage(config),
    email: overrides.email ?? createEmailProvider(config, logger),
    ai: overrides.ai ?? new NoopAiService(),
  };
}
