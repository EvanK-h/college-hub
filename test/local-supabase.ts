import { execFileSync } from "node:child_process";

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
