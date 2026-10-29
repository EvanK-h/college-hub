// Loads a data folder (see scripts/data-folder/format.ts) into Supabase for one user.
//
//   npm run import -- data/mine --email you@example.edu             local database (supabase start)
//   npm run import -- data/mine --remote                            the project in .env.local
//   npm run import -- data/mine --check                             validate only, write nothing
//
// Options: --email (defaults to ALLOWED_EMAIL), --first-term-id N (where term ids start; default 0),
// --yes (skip the confirmation for --remote). The user is created, confirmed, if they don't exist
// yet; they sign in with a magic link as usual.
import { parseArgs } from "node:util";
import { confirm, connect, findUser } from "./data-folder/connect";
import { readFolder } from "./data-folder/files";
import { totals } from "./data-folder/format";
import { writeDataset } from "./data-folder/write";

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      remote: { type: "boolean", default: false },
      check: { type: "boolean", default: false },
      yes: { type: "boolean", default: false },
      email: { type: "string" },
      "first-term-id": { type: "string", default: "0" },
    },
  });
  const folder = positionals[0];
  if (!folder) throw new Error("Usage: npm run import -- <data folder> [--email you@example.edu] [--remote] [--check]");

  const data = readFolder(folder);
  const count = totals(data);
  const unit = data.profile.creditUnit;
  console.log(
    `${folder}: ${count.courses} courses, ${count.credits} ${unit} (${count.transferCredits} ${unit} transfer credit), ${count.requirements} requirements, ${count.swaps} swap options.`,
  );
  if (values.check) return;

  const firstTermId = Number(values["first-term-id"]);
  if (!Number.isInteger(firstTermId) || firstTermId < 0) throw new Error("--first-term-id must be a whole number, 0 or more.");
  const { supabase, target } = connect(values.remote);
  const email = values.email ?? process.env.ALLOWED_EMAIL;
  if (!email) throw new Error("Pass --email, or set ALLOWED_EMAIL.");
  if (values.remote && !values.yes && !(await confirm(`Import ${folder} for ${email} into ${target}?`))) {
    console.log("Nothing imported.");
    return;
  }

  const user = await findUser(supabase, email, { create: true });
  if (user.created) console.log(`Created ${email}; sign in with a magic link.`);
  console.log(`User id ${user.id} (the sync writes as OWNER_ID, so set it to this).`);
  const written = await writeDataset(supabase, user.id, data, { firstTermId });
  console.log(
    `Imported into ${target}: ${written.terms} terms, ${written.courses} courses, ${written.requirements} requirements, ${written.swaps} swap options, ${written.prereqRows} prerequisite rows.`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
