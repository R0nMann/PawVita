import { createApp } from "./app.js";
import { ConfigError, loadConfig } from "./config.js";
import { seedCatalog } from "./db/catalog.js";
import { createDeps } from "./providers.js";
import { startJobs } from "./services/jobs.js";
import { SupabaseStorage } from "./storage/index.js";

async function main() {
  const config = loadConfig();
  const deps = await createDeps(config);
  const { logger, database } = deps;

  if (config.migrateOnStart) {
    await database.migrate();
    logger.info("Database migrations applied");
  }
  await seedCatalog(deps.db);
  if (deps.storage instanceof SupabaseStorage) await deps.storage.ensureBucket(config.maxUploadBytes);

  const app = createApp(deps);
  const server = app.listen(config.port, config.host, (err) => {
    // Express 5 reports listen failures (e.g. the port is taken) here instead of throwing.
    if (err) {
      logger.error({ err }, `Could not listen on port ${config.port}`);
      stopJobs();
      void database.close().finally(() => process.exit(1));
      return;
    }
    logger.info(
      { port: config.port, db: database.kind, auth: deps.auth.name, storage: deps.storage.name, ai: deps.ai.enabled },
      `PawVita API listening on http://${config.host === "0.0.0.0" ? "localhost" : config.host}:${config.port}/api/v1`,
    );
  });
  const stopJobs = startJobs(deps);

  let closing = false;
  const shutdown = (signal: string) => {
    if (closing) return;
    closing = true;
    logger.info({ signal }, "Shutting down");
    stopJobs();
    server.close(() => {
      database
        .close()
        .catch((err) => logger.error({ err }, "Error closing database"))
        .finally(() => process.exit(0));
    });
    // Do not hang forever on keep-alive connections.
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  if (err instanceof ConfigError) {
    console.error(err.message);
  } else {
    console.error("Failed to start PawVita API:", err);
  }
  process.exit(1);
});
