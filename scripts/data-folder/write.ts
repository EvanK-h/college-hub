import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { Dataset } from "./format";

type Client = SupabaseClient<Database>;

// Writes a checked data folder for one owner. Every write is an upsert on a natural key (a name,
// a code, a term id), so re-running after an edit updates rows in place: ids, Canvas links, plans
// and synced data all survive. Nothing missing from the folder is deleted; remove rows in the app
// or in Studio. Link tables (course attributes, prerequisites) are replaced for the courses the
// folder lists, so they always match it.
//
// It runs with the service role, which bypasses RLS, so every row sets owner_id itself. A
// multi-row upsert fills a key a row leaves out with null, so every row names every column.

const fail = (step: string, error: { message: string } | null) => {
  if (error) throw new Error(`${step} failed: ${error.message}`);
};

/** Upserts rows and returns their ids by `key` (the conflict column other than owner_id). */
async function upsertIds<K extends string>(
  run: () => PromiseLike<{ data: ({ id: string } & Record<K, string>)[] | null; error: { message: string } | null }>,
  key: K,
  step: string,
): Promise<Map<string, string>> {
  const { data, error } = await run();
  fail(step, error);
  return new Map((data ?? []).map((row) => [row[key], row.id]));
}

export async function writeDataset(supabase: Client, ownerId: string, data: Dataset, options: { firstTermId: number }) {
  const { profile } = data;
  const owner_id = ownerId;

  fail(
    "Saving the profile",
    (
      await supabase.from("profiles").upsert({
        owner_id,
        school: profile.school,
        preset: profile.preset,
        credit_unit: profile.creditUnit,
        attribute_set_name: profile.attributeSetName,
        grade_scale: profile.gradeScale,
        credit_limits: profile.creditLimits,
      })
    ).error,
  );

  const typeIds = await upsertIds(
    () =>
      supabase
        .from("course_types")
        .upsert(
          profile.courseTypes.map((type, position) => ({ name: type.name, color: type.color, coop: type.coop, position, owner_id })),
          { onConflict: "owner_id,name" },
        )
        .select("id, name"),
    "name",
    "Saving course types",
  );
  const areaIds = await upsertIds(
    () =>
      supabase
        .from("requirement_areas")
        .upsert(profile.areas.map((area, position) => ({ name: area.name, headline: area.headline, position, owner_id })), { onConflict: "owner_id,name" })
        .select("id, name"),
    "name",
    "Saving requirement areas",
  );
  const slotIds = await upsertIds(
    () => supabase.from("swap_slots").upsert(profile.slots.map((name, position) => ({ name, position, owner_id })), { onConflict: "owner_id,name" }).select("id, name"),
    "name",
    "Saving swap slots",
  );
  const attributeIds = await upsertIds(
    () =>
      supabase
        .from("attributes")
        .upsert(
          profile.attributes.map((attribute, position) => ({ code: attribute.code, name: attribute.name, required: attribute.required, position, owner_id })),
          { onConflict: "owner_id,code" },
        )
        .select("id, code"),
    "code",
    "Saving attributes",
  );
  const focusIds = await upsertIds(
    () =>
      supabase
        .from("focuses")
        .upsert(profile.focuses.map((focus, position) => ({ name: focus.name, goal_code: focus.goal, position, owner_id })), { onConflict: "owner_id,name" })
        .select("id, name"),
    "name",
    "Saving focuses",
  );

  // Terms are ordered by id everywhere, so the file's order becomes consecutive ids. Refuse ids
  // that belong to someone else rather than taking their rows over.
  const termRows = data.terms.map((term, index) => ({
    id: options.firstTermId + index,
    name: term.name,
    kind: term.kind,
    campus: term.campus,
    time_zone: term.timeZone ?? profile.timeZone,
    starts_on: term.startsOn,
    ends_on: term.endsOn,
    owner_id,
  }));
  const { data: taken, error: takenError } = await supabase
    .from("terms")
    .select("id")
    .in("id", termRows.map((term) => term.id))
    .neq("owner_id", ownerId);
  fail("Checking term ids", takenError);
  if (taken && taken.length > 0) {
    throw new Error(`Term ids ${taken.map((term) => term.id).join(", ")} belong to someone else in this database. Pass --first-term-id to start elsewhere.`);
  }
  // A renamed term keeps its id, so its courses stay put. A name that moves to another position
  // would collide with its old row (names are unique per owner), so those rows step aside first.
  const { data: existing, error: existingError } = await supabase.from("terms").select("id, name").eq("owner_id", ownerId);
  fail("Reading terms", existingError);
  const wantedId = new Map(termRows.map((term) => [term.name, term.id]));
  for (const term of existing ?? []) {
    const moving = wantedId.get(term.name);
    if (moving !== undefined && moving !== term.id) {
      fail("Renaming a moved term", (await supabase.from("terms").update({ name: `${term.name} (moved, ${term.id})` }).eq("id", term.id)).error);
    }
  }
  fail("Saving terms", (await supabase.from("terms").upsert(termRows, { onConflict: "id" })).error);
  const termIds = new Map(termRows.map((term) => [term.name, term.id]));

  const courseIds = await upsertIds(
    () =>
      supabase
        .from("courses")
        .upsert(
          data.courses.map((course) => ({
            code: course.code,
            title: course.title,
            credits: course.credits,
            course_type_id: typeIds.get(course.type) ?? "",
            status: course.status,
            term_id: termIds.get(course.term) ?? options.firstTermId,
            notes: course.notes,
            owner_id,
          })),
          { onConflict: "owner_id,code" },
        )
        .select("id, code"),
    "code",
    "Saving courses",
  );
  const listedCourses = [...courseIds.values()];

  fail("Clearing course attributes", (await supabase.from("course_attributes").delete().in("course_id", listedCourses)).error);
  const attributeRows = data.courses.flatMap((course) =>
    course.attributes.map((code) => ({ course_id: courseIds.get(course.code) ?? "", attribute_id: attributeIds.get(code) ?? "", owner_id })),
  );
  if (attributeRows.length > 0) fail("Saving course attributes", (await supabase.from("course_attributes").insert(attributeRows)).error);

  const requirementIds = await upsertIds(
    () =>
      supabase
        .from("requirements")
        .upsert(
          data.requirements.map((requirement) => ({
            name: requirement.name,
            area_id: areaIds.get(requirement.area) ?? "",
            options: requirement.options,
            notes: requirement.notes,
            owner_id,
          })),
          { onConflict: "owner_id,name" },
        )
        .select("id, name"),
    "name",
    "Saving requirements",
  );
  const requirementLinks = data.requirements.flatMap((requirement) =>
    requirement.courses.map((code) => ({ requirement_id: requirementIds.get(requirement.name) ?? "", course_id: courseIds.get(code) ?? "", owner_id })),
  );
  if (requirementLinks.length > 0) {
    fail("Linking requirements", (await supabase.from("course_requirements").upsert(requirementLinks, { onConflict: "course_id,requirement_id" })).error);
  }

  // The same course can be a swap for two slots, so a swap is keyed by its name and slot.
  const swapKey = (swapIn: string, slotId: string) => `${swapIn}|${slotId}`;
  const { data: savedSwaps, error: swapError } = await supabase
    .from("swap_options")
    .upsert(
      data.swaps.map((swap) => ({
        swap_in: swap.swapIn,
        slot_id: slotIds.get(swap.slot) ?? "",
        fits_in: swap.fitsIn,
        prerequisites: swap.prerequisites,
        why_consider: swap.whyConsider,
        why_current_better: swap.whyCurrentBetter,
        owner_id,
      })),
      { onConflict: "owner_id,swap_in,slot_id" },
    )
    .select("id, swap_in, slot_id");
  fail("Saving swap options", swapError);
  const swapIds = new Map((savedSwaps ?? []).map((swap) => [swapKey(swap.swap_in, swap.slot_id), swap.id]));
  const swapIdOf = (swap: Dataset["swaps"][number]) => swapIds.get(swapKey(swap.swapIn, slotIds.get(swap.slot) ?? "")) ?? "";

  const replaces = data.swaps.flatMap((swap) => swap.replaces.map((code) => ({ swap_option_id: swapIdOf(swap), course_id: courseIds.get(code) ?? "", owner_id })));
  if (replaces.length > 0) fail("Linking swaps", (await supabase.from("swap_replaces").upsert(replaces, { onConflict: "swap_option_id,course_id" })).error);
  const ratings = data.swaps.flatMap((swap) =>
    Object.entries(swap.relevance).map(([focus, relevance]) => ({ swap_option_id: swapIdOf(swap), focus_id: focusIds.get(focus) ?? "", relevance, owner_id })),
  );
  if (ratings.length > 0) fail("Rating swaps", (await supabase.from("swap_relevance").upsert(ratings, { onConflict: "swap_option_id,focus_id" })).error);

  // Prerequisites for courses in the plan replace what those courses had; entries for courses
  // you don't take are skipped.
  const prereqRows = data.prereqs.flatMap((entry) => {
    const courseId = courseIds.get(entry.course);
    if (!courseId) return [];
    return (["prereq", "coreq", "recommended"] as const).flatMap((kind) =>
      (entry[kind] ?? []).flatMap((group, index) => group.map((code) => ({ course_id: courseId, requires_code: code, kind, option_group: index + 1, owner_id }))),
    );
  });
  const withPrereqs = [...new Set(data.prereqs.flatMap((entry) => courseIds.get(entry.course) ?? []))];
  fail("Clearing prerequisites", (await supabase.from("course_prereqs").delete().in("course_id", withPrereqs)).error);
  if (prereqRows.length > 0) fail("Saving prerequisites", (await supabase.from("course_prereqs").insert(prereqRows)).error);

  return {
    terms: termRows.length,
    courses: courseIds.size,
    requirements: requirementIds.size,
    swaps: swapIds.size,
    prereqRows: prereqRows.length,
  };
}
