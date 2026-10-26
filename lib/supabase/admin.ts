import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { getAdminEnv } from "@/lib/env.server";
import { getPublicEnv } from "@/lib/env";

// Service-role client: it bypasses row-level security, so it may only be imported by sync code
// (app/api/sync, lib/canvas, lib/timetable). Pages and server actions use lib/supabase/server.ts.
export function createAdminClient() {
  return createClient<Database>(getPublicEnv().NEXT_PUBLIC_SUPABASE_URL, getAdminEnv().SUPABASE_SERVICE_ROLE_KEY, {
    // There is no user session to keep or refresh; every call is the server acting as itself.
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
