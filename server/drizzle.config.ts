import { defineConfig } from "drizzle-kit";

// Only `drizzle-kit generate` is used: it diffs src/db/schema.ts against the
// previous snapshot and writes SQL into ./drizzle. Migrations are applied by
// the app itself (src/db/migrate.ts), so no database URL is needed here.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  schemaFilter: ["pawvita"],
  casing: "snake_case",
});
