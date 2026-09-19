import { loadConfig } from "../config.js";
import { seedCatalog } from "./catalog.js";
import { createDatabase } from "./client.js";

/** `npm run db:migrate` — apply pending migrations, then add any missing catalogue rows. */
const config = loadConfig();
const database = await createDatabase(config.db);
try {
  await database.migrate();
  await seedCatalog(database.db);
  console.log(`Migrations applied (${database.kind}).`);
} finally {
  await database.close();
}
