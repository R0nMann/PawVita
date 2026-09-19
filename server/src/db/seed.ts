import { loadConfig } from "../config.js";
import { createDeps } from "../providers.js";
import { seedCatalog } from "./catalog.js";
import { seedDemo } from "./demo.js";

/**
 * `npm run db:seed` — refresh the symptom / disease / vaccine catalogues.
 * `npm run db:seed -- --demo` — also load the demo dataset (regions,
 * hospitals, users with sign-in identities, herds and cases).
 */
const args = new Set(process.argv.slice(2));
const config = loadConfig();
const deps = await createDeps(config);
try {
  await deps.database.migrate();
  await seedCatalog(deps.db, { refresh: true });
  console.log("Catalogue refreshed.");
  if (args.has("--demo")) {
    const result = await seedDemo(deps);
    if (result.skipped) {
      console.log("Demo data already present — skipped.");
    } else {
      console.log(`\nDemo accounts (password for email/username logins: ${result.password}):`);
      console.table(result.accounts);
      if (deps.auth.name === "local") {
        console.log("Phone logins: request an OTP; with AUTH_PROVIDER=local the code is printed in the server log.");
      }
    }
  }
} finally {
  await deps.database.close();
}
