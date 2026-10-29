import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import type { Database } from "@/lib/database.types";
import { readLocalSupabase } from "@/test/local-supabase";
import { findUser } from "./connect";
import { readFolder } from "./files";
import { applyPreset, FOLDER_FILES, parseFolder, type Dataset } from "./format";
import { readDataset } from "./read";
import { writeDataset } from "./write";

// Imports each data folder for a throwaway local user, exports it again and checks nothing was
// lost or changed on the way. Needs the local Supabase stack; see test/local-supabase.ts.
const local = readLocalSupabase();
const FOLDERS = ["data/example", "data/mine"].filter((folder) => existsSync(join(folder, "profile.json")));

// What a folder means once imported: order doesn't matter (terms and categories aside, whose
// order is their position), and prerequisites only count for courses in the plan.
function meaning(data: Dataset) {
  const by = <T>(key: (row: T) => string) => (a: T, b: T) => key(a).localeCompare(key(b));
  const codes = new Set(data.courses.map((course) => course.code));
  const prereqRows = data.prereqs
    .filter((entry) => codes.has(entry.course))
    .flatMap((entry) => (["prereq", "coreq", "recommended"] as const).flatMap((kind) => (entry[kind] ?? []).flatMap((group, index) => group.map((code) => `${entry.course} ${kind} ${index + 1} ${code}`))))
    .sort();
  return {
    ...data,
    courses: data.courses.map((course) => ({ ...course, attributes: course.attributes.toSorted() })).toSorted(by((course) => course.code)),
    requirements: data.requirements.toSorted(by((requirement) => requirement.name)),
    swaps: data.swaps.toSorted(by((swap) => `${swap.swapIn}|${swap.slot}`)),
    prereqs: prereqRows,
  };
}

describe.skipIf(!local || FOLDERS.length === 0)("data folders against the local database", () => {
  const admin = createClient<Database>(local?.url ?? "http://127.0.0.1", local?.serviceKey ?? "unused", { auth: { persistSession: false } });
  const users: string[] = [];

  afterAll(async () => {
    for (const id of users) {
      for (const table of ["swap_options", "requirements", "courses", "course_types", "requirement_areas", "swap_slots", "attributes", "focuses", "profiles"] as const) {
        await admin.from(table).delete().eq("owner_id", id);
      }
      await admin.from("terms").delete().eq("owner_id", id);
      await admin.auth.admin.deleteUser(id);
    }
  });

  it.each(FOLDERS.map((folder, index) => [folder, index] as const))("round-trips %s", async (folder, index) => {
    const user = await findUser(admin, `folder-test-${index}@example.test`, { create: true });
    users.push(user.id);
    const data = readFolder(folder);

    const first = await writeDataset(admin, user.id, data, { firstTermId: 20_000 + index * 100 });
    const { data: before } = await admin.from("courses").select("id, code").eq("owner_id", user.id).order("code");
    // A second run updates in place: same counts, same row ids.
    expect(await writeDataset(admin, user.id, data, { firstTermId: 20_000 + index * 100 })).toEqual(first);
    const { data: after } = await admin.from("courses").select("id, code").eq("owner_id", user.id).order("code");
    expect(after).toEqual(before);

    const exported = parseFolder(await readDataset(admin, user.id));
    if ("errors" in exported) throw new Error(exported.errors.join("\n"));
    const got = meaning(applyPreset(exported.data));
    const want = meaning(data);
    for (const key of Object.keys(want) as (keyof typeof want)[]) expect(got[key], key).toEqual(want[key]);
  });
});

// The import check from CLAUDE.md, against your own folder where it exists (it's gitignored).
describe.skipIf(!existsSync("data/mine/profile.json"))("data/mine import check", () => {
  it("has 56 courses, 171 SH with 53 SH of transfer credit, 31 requirements and 32 swap options", async () => {
    const { totals } = await import("./format");
    expect(totals(readFolder("data/mine"))).toEqual({ courses: 56, credits: 171, transferCredits: 53, requirements: 31, swaps: 32 });
  });

  it("is plain JSON in every file", () => {
    for (const { file } of Object.values(FOLDER_FILES)) expect(() => JSON.parse(readFileSync(join("data/mine", file), "utf-8"))).not.toThrow();
  });
});
