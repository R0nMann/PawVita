import fs from "node:fs";
import path from "node:path";
import type { SQL } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type { Config } from "../config.js";
import * as schema from "./schema.js";

/** Drizzle database handle. Transactions share this type, so services accept either. */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export interface Database {
  db: Db;
  kind: "postgres" | "pglite";
  ping(): Promise<void>;
  migrate(): Promise<void>;
  close(): Promise<void>;
}

export const MIGRATIONS_FOLDER = path.resolve(import.meta.dirname, "../../drizzle");

/**
 * Connect to Supabase Postgres (DATABASE_URL) or, without one, an embedded
 * PGlite instance — on disk for development, in memory for tests.
 */
export async function createDatabase(cfg: Config["db"]): Promise<Database> {
  if (cfg.kind === "postgres") {
    const { default: postgres } = await import("postgres");
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    const client = postgres(cfg.url, {
      max: cfg.poolMax,
      // Supavisor in transaction mode (port 6543) does not support prepared statements.
      prepare: cfg.prepare,
      onnotice: () => {},
    });
    const db = drizzle(client, { schema, casing: "snake_case" });
    return {
      // Both drivers' databases extend PgDatabase; only the query-result type differs.
      db: db as unknown as Db,
      kind: "postgres",
      ping: async () => {
        await client`select 1`;
      },
      migrate: () => migrate(db, { migrationsFolder: MIGRATIONS_FOLDER }),
      close: () => client.end({ timeout: 5 }),
    };
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  if (cfg.dataDir) fs.mkdirSync(path.dirname(cfg.dataDir), { recursive: true });
  const client = cfg.dataDir ? new PGlite(cfg.dataDir) : new PGlite();
  await client.waitReady;
  const db = drizzle(client, { schema, casing: "snake_case" });
  return {
    db: db as unknown as Db,
    kind: "pglite",
    ping: async () => {
      await client.query("select 1");
    },
    migrate: () => migrate(db, { migrationsFolder: MIGRATIONS_FOLDER }),
    close: () => client.close(),
  };
}

/**
 * Run a raw SQL query and return its rows. postgres-js resolves to an array
 * and PGlite to `{ rows }`; this hides the difference. Cast aggregates in SQL
 * (`count(*)::int`, `avg(x)::float8`) so both drivers return numbers.
 */
export async function queryRows<T>(db: Db, query: SQL): Promise<T[]> {
  const result = (await db.execute(query)) as unknown;
  if (Array.isArray(result)) return result as T[];
  return ((result as { rows?: T[] }).rows ?? []) as T[];
}
