// Writes one user's data from Supabase to a data folder: the reverse of scripts/import.ts, for
// keeping a folder in step with changes made in the app.
//
//   npm run export -- data/mine --email you@example.edu     from the local database
//   npm run export -- data/mine --remote                    from the project in .env.local
//
// Existing files in the folder are replaced. --email defaults to ALLOWED_EMAIL.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { connect, findUser } from "./data-folder/connect";
import { FOLDER_FILES } from "./data-folder/format";
import { readDataset } from "./data-folder/read";

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { remote: { type: "boolean", default: false }, email: { type: "string" } },
  });
  const folder = positionals[0];
  if (!folder) throw new Error("Usage: npm run export -- <data folder> [--email you@example.edu] [--remote]");

  const { supabase, target } = connect(values.remote);
  const email = values.email ?? process.env.ALLOWED_EMAIL;
  if (!email) throw new Error("Pass --email, or set ALLOWED_EMAIL.");
  const user = await findUser(supabase, email, { create: false });
  const data = await readDataset(supabase, user.id);

  mkdirSync(folder, { recursive: true });
  for (const [key, { file }] of Object.entries(FOLDER_FILES)) {
    writeFileSync(join(folder, file), `${JSON.stringify(data[key as keyof typeof data], null, 2)}\n`);
  }
  console.log(`Exported ${email} from ${target} to ${folder}: ${data.courses.length} courses, ${data.requirements.length} requirements, ${data.swaps.length} swap options.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
