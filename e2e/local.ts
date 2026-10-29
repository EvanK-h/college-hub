import { readLocalSupabase } from "../test/local-supabase";

// End-to-end tests run against the local Supabase stack only: the keys come from `supabase status`,
// never from .env.local, so a test run can't reach production.
export function localSupabase() {
  const local = readLocalSupabase();
  if (!local) throw new Error("End-to-end tests need the local Supabase stack. Run `supabase start` first.");
  return local;
}

// An invented user, with a fixed id so the test server can be told it is the owner (OWNER_ID).
export const E2E_EMAIL = "e2e@example.test";
export const E2E_USER_ID = "e2e0e2e0-0000-4000-8000-000000000001";

export const E2E_PORT = 3100;
// localhost (not 127.0.0.1): the magic link's redirect must match the allow-list in supabase/config.toml.
export const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;

/** Local Mailpit, where the local stack delivers every email. */
export const MAILPIT_URL = "http://127.0.0.1:54324";
