import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    // Each test file boots its own in-memory Postgres; running files in
    // parallel is fine, but migrations make the first query slow.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
