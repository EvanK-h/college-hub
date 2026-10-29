import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/lib/database.types";
import { readLocalSupabase } from "@/test/local-supabase";

// create_plan() and apply_plan() run as the signed-in user (RLS applies), so these tests sign in
// as a throwaway local user. They need the local Supabase stack; see test/local-supabase.ts.
const local = readLocalSupabase();

// Invented data, under terms no other DB test uses.
const TERMS = [30011, 30012, 30013];
const EMAIL = "plans-db-test@example.test";

describe.skipIf(!local)("create_plan and apply_plan against the local database", () => {
  const options = { auth: { persistSession: false } };
  const admin = createClient<Database>(local?.url ?? "http://127.0.0.1", local?.serviceKey ?? "unused", options);
  const user = createClient<Database>(local?.url ?? "http://127.0.0.1", local?.anonKey ?? "unused", options);
  const ids = { owner: "", planned: "", swapped: "", done: "", swap: "", badSwap: "" };

  // `check` fails the test on an error; `value` also insists on data and returns it.
  const check = ({ error }: { error: { message: string } | null }) => {
    if (error) throw new Error(error.message);
  };
  const value = <T,>({ data, error }: { data: T; error: { message: string } | null }): NonNullable<T> => {
    if (error || data === null || data === undefined) throw new Error(error?.message ?? "no data");
    return data;
  };

  async function cleanUp() {
    const { data } = await admin.auth.admin.listUsers();
    const existing = data.users.find((u) => u.email === EMAIL);
    if (!existing) return;
    for (const table of ["plans", "swap_options", "courses"] as const) check(await admin.from(table).delete().eq("owner_id", existing.id));
    check(await admin.from("terms").delete().in("id", TERMS));
    await admin.auth.admin.deleteUser(existing.id);
  }

  beforeAll(async () => {
    await cleanUp();
    const password = randomBytes(18).toString("base64url");
    const created = await admin.auth.admin.createUser({ email: EMAIL, password, email_confirm: true });
    check(created);
    ids.owner = created.data.user?.id ?? "";
    check(await user.auth.signInWithPassword({ email: EMAIL, password }));

    check(await admin.from("terms").insert(TERMS.map((id, i) => ({ id, name: `Plans test term ${i + 1}`, kind: "semester" as const, owner_id: ids.owner }))));
    const courses = value(
      await admin
        .from("courses")
        .insert([
          // A multi-row insert fills missing keys with null, so every row names every column.
          { code: "ZZ 1000", title: "Planned", credits: 4, type: "cs_core", term_id: TERMS[0], status: "planned", nupath: [], notes: null, owner_id: ids.owner },
          { code: "ZZ 2000", title: "Swapped out", credits: 4, type: "cs_core", term_id: TERMS[1], status: "planned", nupath: ["ND"], notes: "old notes", owner_id: ids.owner },
          { code: "ZZ 0500", title: "Done", credits: 4, type: "cs_core", term_id: TERMS[0], status: "done", nupath: [], notes: null, owner_id: ids.owner },
        ])
        .select("id, code"),
    );
    ids.planned = courses.find((c) => c.code === "ZZ 1000")?.id ?? "";
    ids.swapped = courses.find((c) => c.code === "ZZ 2000")?.id ?? "";
    ids.done = courses.find((c) => c.code === "ZZ 0500")?.id ?? "";
    check(await admin.from("course_prereqs").insert({ course_id: ids.swapped, requires_code: "ZZ 1000", owner_id: ids.owner }));

    const swaps = value(
      await admin
        .from("swap_options")
        .insert([
          { swap_in: "ZZ 4770 · Test Swap", slot: "khoury_elective", quantum_relevance: "high", owner_id: ids.owner },
          { swap_in: "ZZ 1 + 2 · Not one course", slot: "khoury_elective", quantum_relevance: "low", owner_id: ids.owner },
        ])
        .select("id, swap_in"),
    );
    ids.swap = swaps.find((s) => s.swap_in.startsWith("ZZ 4770"))?.id ?? "";
    ids.badSwap = swaps.find((s) => s.swap_in.startsWith("ZZ 1 "))?.id ?? "";
    check(await admin.from("swap_replaces").insert({ swap_option_id: ids.swap, course_id: ids.swapped, owner_id: ids.owner }));
  });

  afterAll(cleanUp);

  it("copies the planned courses, then another plan, row for row", async () => {
    const plan = value(await user.rpc("create_plan", { p_name: "  Main idea  " }));
    const rows = value(await user.from("plan_courses").select("course_id, term_id").eq("plan_id", plan));
    expect(rows).toHaveLength(2); // the done course isn't copied
    expect(value(await user.from("plans").select("name").eq("id", plan).single()).name).toBe("Main idea");

    check(await user.from("plan_courses").insert({ plan_id: plan, swap_option_id: ids.swap, replaces_course_id: ids.swapped, term_id: TERMS[2] }));
    const copy = value(await user.rpc("create_plan", { p_name: "Copy", p_from: plan }));
    expect(value(await user.from("plan_courses").select("id").eq("plan_id", copy))).toHaveLength(3);
  });

  it("makes a plan real: moves courses, rewrites swapped courses in place, tidies the plan", async () => {
    const plan = value(await user.rpc("create_plan", { p_name: "To apply" }));
    check(await user.from("plan_courses").update({ term_id: TERMS[2] }).eq("plan_id", plan).eq("course_id", ids.planned));
    check(await user.from("plan_courses").insert({ plan_id: plan, swap_option_id: ids.swap, replaces_course_id: ids.swapped, term_id: TERMS[2] }));

    check(await user.rpc("apply_plan", { p_plan: plan }));

    const courses = value(await user.from("courses").select("id, code, title, term_id, nupath, notes").order("code"));
    expect(courses.find((c) => c.id === ids.planned)?.term_id).toBe(TERMS[2]);
    expect(courses.find((c) => c.id === ids.swapped)).toMatchObject({ code: "ZZ 4770", title: "Test Swap", term_id: TERMS[2], nupath: [], notes: null });
    expect(courses.find((c) => c.id === ids.done)?.term_id).toBe(TERMS[0]);
    expect(value(await user.from("course_prereqs").select("id").eq("course_id", ids.swapped))).toHaveLength(0);
    expect(value(await user.from("swap_replaces").select("course_id").eq("swap_option_id", ids.swap))).toHaveLength(0);

    const rows = value(await user.from("plan_courses").select("course_id, swap_option_id, term_id").eq("plan_id", plan));
    expect(rows.every((row) => row.swap_option_id === null)).toBe(true);
    expect(rows.find((row) => row.course_id === ids.swapped)?.term_id).toBe(TERMS[2]);
  });

  it("refuses a swap that isn't one course, and changes nothing", async () => {
    const plan = value(await user.rpc("create_plan", { p_name: "Bad swap" }));
    check(await user.from("plan_courses").update({ term_id: TERMS[1] }).eq("plan_id", plan).eq("course_id", ids.planned));
    check(await user.from("plan_courses").insert({ plan_id: plan, swap_option_id: ids.badSwap, replaces_course_id: ids.swapped, term_id: TERMS[0] }));

    const { error } = await user.rpc("apply_plan", { p_plan: plan });
    expect(error?.message).toMatch(/no single course code/);
    expect(value(await user.from("courses").select("term_id").eq("id", ids.planned).single()).term_id).toBe(TERMS[2]);
  });
});
