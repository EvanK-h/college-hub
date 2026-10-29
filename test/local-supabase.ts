import { execFileSync } from "node:child_process";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Database tests run the real SQL functions, so they need the local Supabase stack
// (`supabase start`). They ask the CLI for the local keys, which means they can only ever
// point at the local database, never at production, and they skip themselves if it isn't running.
export function readLocalSupabase(): { url: string; serviceKey: string; anonKey: string } | null {
  try {
    const output = execFileSync("supabase", ["status", "-o", "env"], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 15_000,
    });
    const values = new Map<string, string>();
    for (const line of output.split("\n")) {
      const match = line.match(/^([A-Z_]+)="?(.*?)"?$/);
      if (match?.[1] && match[2] !== undefined) values.set(match[1], match[2]);
    }
    const url = values.get("API_URL");
    const serviceKey = values.get("SERVICE_ROLE_KEY");
    const anonKey = values.get("ANON_KEY");
    return url && serviceKey && anonKey ? { url, serviceKey, anonKey } : null;
  } catch {
    return null;
  }
}

/** A course type for an invented owner, created on first use, so test courses have one. */
export async function testCourseType(client: SupabaseClient<Database>, ownerId: string): Promise<string> {
  const { data, error } = await client
    .from("course_types")
    .upsert({ name: "Test type", color: 1, owner_id: ownerId }, { onConflict: "owner_id,name" })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}
