import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only` throws by design outside a server bundle. Tests that
      // import a server module for its pure exports (constants, mappers) need it
      // to be inert rather than fatal.
      "server-only": fileURLToPath(new URL("./src/test/server-only-stub.ts", import.meta.url))
    }
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Keep server-only imports from crashing unit tests: we test pure functions.
    globals: false
  }
});
