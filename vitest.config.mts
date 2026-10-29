import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Mirror the "@/*" import alias from tsconfig.json.
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
      "server-only": fileURLToPath(new URL("./test/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // e2e/ holds the Playwright specs; they run with `npm run test:e2e`, not here.
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
