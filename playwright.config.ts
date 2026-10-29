import { defineConfig, devices } from "@playwright/test";
import { E2E_BASE_URL, E2E_EMAIL, E2E_PORT, E2E_USER_ID, localSupabase } from "./e2e/local";

// End-to-end tests: one per main flow, in a real browser against a production build of the app
// on its own port, wired to the local Supabase stack. See the 2026-10-29 decision.
const local = localSupabase();

export default defineConfig({
  testDir: "./e2e",
  // The specs share one invented user and reseed it, so they run one at a time.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: E2E_BASE_URL,
    trace: "retain-on-failure",
  },
  projects: [
    // Signs in once through the real magic-link flow and saves the session for the rest.
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/user.json" },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: `npm run build && npx next start -p ${E2E_PORT}`,
    url: `${E2E_BASE_URL}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    // Variables set here win over .env.local, so the server only ever sees the local stack and the
    // invented user. The Canvas token and timetable feed are blanked, so nothing calls out.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: local.url,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: local.anonKey,
      SUPABASE_SERVICE_ROLE_KEY: local.serviceKey,
      ALLOWED_EMAIL: E2E_EMAIL,
      OWNER_ID: E2E_USER_ID,
      CANVAS_TOKEN: "",
      OUTLOOK_ICS_URL: "",
    },
  },
});
