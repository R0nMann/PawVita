import type { Logger } from "pino";
import type { AiService } from "./ai/index.js";
import type { AuthProvider } from "./auth/provider.js";
import type { Config } from "./config.js";
import type { Database, Db } from "./db/client.js";
import type { StorageProvider } from "./storage/index.js";

/** Everything a router or service needs, created once in index.ts (or a test). */
export interface Deps {
  config: Config;
  database: Database;
  db: Db;
  auth: AuthProvider;
  storage: StorageProvider;
  ai: AiService;
  logger: Logger;
}
