import { existsSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { readLocalSupabase } from "@/test/local-supabase";

// Shared by the import and export scripts: which database to use, and whose data.

/** The user with this email; with `create`, created (and confirmed) if there isn't one yet. */
export async function findUser(supabase: SupabaseClient<Database>, email: string, options: { create: boolean }): Promise<{ id: string; created: boolean }> {
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`Listing users failed: ${error.message}`);
    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase());
    if (user) return { id: user.id, created: false };
    if (data.users.length < 1000) break;
  }
  if (!options.create) throw new Error(`No user ${email} in this database.`);
  const { data, error } = await supabase.auth.admin.createUser({ email, email_confirm: true });
  if (error || !data.user) throw new Error(`Creating ${email} failed: ${error?.message ?? "no user returned"}`);
  return { id: data.user.id, created: true };
}

export function connect(remote: boolean): { supabase: SupabaseClient<Database>; target: string } {
  const options = { auth: { persistSession: false } };
  if (!remote) {
    const local = readLocalSupabase();
    if (!local) throw new Error("The local database isn't running. Start it with `supabase start`, or pass --remote.");
    return { supabase: createClient<Database>(local.url, local.serviceKey, options), target: `local (${local.url})` };
  }
  // Only --remote reads .env.local, so a local import can never reach production by accident.
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("--remote needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (in .env.local or the environment).");
  return { supabase: createClient<Database>(url, key, options), target: new URL(url).host };
}

export async function confirm(question: string): Promise<boolean> {
  const readline = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await readline.question(`${question} [y/N] `);
  readline.close();
  return answer.trim().toLowerCase() === "y";
}
