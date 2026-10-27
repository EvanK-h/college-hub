import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { AI_RELEVANCE } from "./ai-relevance";

/**
 * Sets each swap option's AI relevance from the list. Swaps not in the list are reported, not
 * changed, so a new swap from Notion shows up here until it is rated. Safe to re-run.
 */
export async function seedAiRelevance(supabase: SupabaseClient<Database>, ownerId: string) {
  const { data: swaps, error } = await supabase.from("swap_options").select("id, swap_in").eq("owner_id", ownerId);
  if (error) throw new Error(`Reading swap options failed: ${error.message}`);

  const unrated = swaps.filter((swap) => !(swap.swap_in in AI_RELEVANCE)).map((swap) => swap.swap_in);
  const unused = Object.keys(AI_RELEVANCE).filter((name) => !swaps.some((swap) => swap.swap_in === name));
  let updated = 0;
  for (const swap of swaps) {
    const relevance = AI_RELEVANCE[swap.swap_in];
    if (!relevance) continue;
    const { error: updateError } = await supabase.from("swap_options").update({ ai_relevance: relevance }).eq("id", swap.id);
    if (updateError) throw new Error(`Updating ${swap.swap_in} failed: ${updateError.message}`);
    updated += 1;
  }
  return { updated, unrated, unused };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var ${name}`);
  return value;
}

async function main() {
  const supabase = createClient<Database>(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"));
  const result = await seedAiRelevance(supabase, requireEnv("OWNER_ID"));
  console.log(`Rated ${result.updated} swap options for AI`);
  if (result.unrated.length > 0) console.log(`Not rated yet: ${result.unrated.join(", ")}`);
  if (result.unused.length > 0) console.log(`In the list but not in the swaps: ${result.unused.join(", ")}`);
}

// Run only when executed directly, so tests can import the list without side effects.
if (process.argv[1]?.endsWith("import-ai-relevance.ts")) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
