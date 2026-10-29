import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import type { Database } from "@/lib/database.types";
import { getPublicEnv } from "@/lib/env";

export async function createClient() {
  // The Supabase auth client reads the clock (Date.now) as soon as it is built, which Next refuses
  // while pre-rendering a route's App Shell for prefetching. Everything read through this client is
  // per-request anyway, so wait for the real request; the shell shows the Suspense fallback instead.
  await connection();
  const cookieStore = await cookies();
  const env = getPublicEnv();

  return createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies; the proxy refreshes the session instead.
        }
      },
    },
  });
}
