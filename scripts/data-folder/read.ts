import { isDeepStrictEqual } from "node:util";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { NORTHEASTERN } from "./northeastern";

type Client = SupabaseClient<Database>;

// The reverse of write.ts: one owner's rows as data folder files, so the folder can be refreshed
// from what you changed in the app. Values the profile's preset already supplies are left out,
// and optional fields are only written when set, so the files stay short.

const must = <T>(step: string, result: { data: T | null; error: { message: string } | null }): T => {
  if (result.error || result.data === null) throw new Error(`${step} failed: ${result.error?.message ?? "no data"}`);
  return result.data;
};

/** Drops null, undefined and empty-array fields. */
function compact<T extends Record<string, unknown>>(row: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(row).filter(([, value]) => value !== null && value !== undefined && !(Array.isArray(value) && value.length === 0)),
  ) as Partial<T>;
}

function groupsOf(rows: { kind: string; option_group: number; requires_code: string }[], kind: string): string[][] | undefined {
  const groups = Map.groupBy(
    rows.filter((row) => row.kind === kind).sort((a, b) => a.option_group - b.option_group),
    (row) => row.option_group,
  );
  const list = [...groups.values()].map((group) => group.map((row) => row.requires_code));
  return list.length > 0 ? list : undefined;
}

export async function readDataset(supabase: Client, ownerId: string) {
  const [
    profile,
    types,
    areas,
    slots,
    attributes,
    focuses,
    terms,
    courses,
    courseAttributes,
    requirements,
    links,
    swaps,
    replaces,
    ratings,
    prereqs,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("owner_id", ownerId).maybeSingle(),
    supabase.from("course_types").select("*").eq("owner_id", ownerId).order("position"),
    supabase.from("requirement_areas").select("*").eq("owner_id", ownerId).order("position"),
    supabase.from("swap_slots").select("*").eq("owner_id", ownerId).order("position"),
    supabase.from("attributes").select("*").eq("owner_id", ownerId).order("position"),
    supabase.from("focuses").select("*").eq("owner_id", ownerId).order("position"),
    supabase.from("terms").select("*").eq("owner_id", ownerId).order("id"),
    supabase.from("courses").select("*").eq("owner_id", ownerId).order("term_id").order("code"),
    supabase.from("course_attributes").select("*").eq("owner_id", ownerId),
    supabase.from("requirements").select("*").eq("owner_id", ownerId).order("name"),
    supabase.from("course_requirements").select("*").eq("owner_id", ownerId),
    supabase.from("swap_options").select("*").eq("owner_id", ownerId).order("swap_in"),
    supabase.from("swap_replaces").select("*").eq("owner_id", ownerId),
    supabase.from("swap_relevance").select("*").eq("owner_id", ownerId),
    supabase.from("course_prereqs").select("*").eq("owner_id", ownerId),
  ]);

  const typeRows = must("Reading course types", types);
  const areaRows = must("Reading areas", areas);
  const slotRows = must("Reading slots", slots);
  const attributeRows = must("Reading attributes", attributes);
  const focusRows = must("Reading focuses", focuses);
  const termRows = must("Reading terms", terms);
  const courseRows = must("Reading courses", courses);
  const profileRow = profile.data;
  const preset = profileRow?.preset === "northeastern" ? NORTHEASTERN : null;

  const name = <T extends { id: string }>(rows: T[], key: keyof T) => new Map(rows.map((row) => [row.id, String(row[key])]));
  const typeName = name(typeRows, "name");
  const areaName = name(areaRows, "name");
  const slotName = name(slotRows, "name");
  const focusName = name(focusRows, "name");
  const courseCode = name(courseRows, "code");
  const termName = new Map(termRows.map((term) => [term.id, term.name]));

  // The most common term time zone becomes the default; terms only name a different one.
  const zones = Map.groupBy(termRows, (term) => term.time_zone);
  const timeZone = [...zones.entries()].sort((a, b) => b[1].length - a[1].length)[0]?.[0] ?? preset?.timeZone ?? "UTC";

  // A field equal to the preset's is left out, so the preset keeps supplying it.
  const unlessPreset = <T>(value: T, presetValue: unknown) => (preset && isDeepStrictEqual(value, presetValue) ? undefined : value);
  const attributeList = attributeRows.map((row) => ({
    code: row.code,
    name: row.name,
    required: row.required,
  }));

  const attributesOf = Map.groupBy(must("Reading course attributes", courseAttributes), (row) => row.course_id);
  const linksOf = Map.groupBy(must("Reading requirement links", links), (row) => row.requirement_id);
  const replacesOf = Map.groupBy(must("Reading swap links", replaces), (row) => row.swap_option_id);
  const ratingsOf = Map.groupBy(must("Reading swap ratings", ratings), (row) => row.swap_option_id);
  const prereqsOf = Map.groupBy(must("Reading prerequisites", prereqs), (row) => row.course_id);

  return {
    profile: compact({
      preset: profileRow?.preset ?? undefined,
      school: unlessPreset(profileRow?.school ?? undefined, preset?.school),
      creditUnit: unlessPreset(profileRow?.credit_unit, preset?.creditUnit),
      timeZone: unlessPreset(timeZone, preset?.timeZone),
      attributeSetName: unlessPreset(profileRow?.attribute_set_name ?? undefined, preset?.attributeSetName),
      gradeScale: unlessPreset(profileRow?.grade_scale, preset?.gradeScale),
      creditLimits: unlessPreset(profileRow?.credit_limits, preset?.creditLimits),
      courseTypes: typeRows.map((row) =>
        compact({
          name: row.name,
          color: row.color,
          coop: row.coop || undefined,
        }),
      ),
      areas: areaRows.map((row) => compact({ name: row.name, headline: row.headline || undefined })),
      slots: slotRows.map((row) => row.name),
      attributes: unlessPreset(attributeList, preset?.attributes),
      focuses: focusRows.map((row) => compact({ name: row.name, goal: row.goal_code })),
    }),
    terms: termRows.map((term) =>
      compact({
        name: term.name,
        kind: term.kind,
        campus: term.campus,
        timeZone: term.time_zone === timeZone ? undefined : term.time_zone,
        startsOn: term.starts_on,
        endsOn: term.ends_on,
      }),
    ),
    courses: courseRows.map((course) =>
      compact({
        code: course.code,
        title: course.title,
        credits: Number(course.credits),
        type: typeName.get(course.course_type_id),
        status: course.status,
        term: termName.get(course.term_id),
        // In the attributes' own order, as profile.json lists them.
        attributes: attributeRows.filter((attribute) => attributesOf.get(course.id)?.some((row) => row.attribute_id === attribute.id)).map((attribute) => attribute.code),
        notes: course.notes,
      }),
    ),
    requirements: must("Reading requirements", requirements).map((requirement) =>
      compact({
        name: requirement.name,
        area: areaName.get(requirement.area_id),
        options: requirement.options,
        notes: requirement.notes,
        courses: (linksOf.get(requirement.id) ?? []).map((row) => courseCode.get(row.course_id) ?? "").sort(),
      }),
    ),
    // By name, then slot order: the same course can be a swap for two slots.
    swaps: must("Reading swap options", swaps)
      .sort(
        (a, b) =>
          a.swap_in.localeCompare(b.swap_in) ||
          slotRows.findIndex((slot) => slot.id === a.slot_id) - slotRows.findIndex((slot) => slot.id === b.slot_id),
      )
      .map((swap) =>
        compact({
          swapIn: swap.swap_in,
          slot: slotName.get(swap.slot_id),
          fitsIn: swap.fits_in,
          prerequisites: swap.prerequisites,
          whyConsider: swap.why_consider,
          whyCurrentBetter: swap.why_current_better,
          replaces: (replacesOf.get(swap.id) ?? []).map((row) => courseCode.get(row.course_id) ?? "").sort(),
          relevance: Object.fromEntries((ratingsOf.get(swap.id) ?? []).map((row) => [focusName.get(row.focus_id) ?? "", row.relevance])),
        }),
      ),
    // Every course with prerequisites, plus a bare entry for a course the preset would give some
    // that has none here, so a re-import doesn't bring back ones you removed.
    prereqs: courseRows
      .filter((course) => prereqsOf.has(course.id) || preset?.prereqs.some((entry) => entry.course === course.code))
      .map((course) => {
        const rows = prereqsOf.get(course.id) ?? [];
        return compact({
          course: course.code,
          prereq: groupsOf(rows, "prereq"),
          coreq: groupsOf(rows, "coreq"),
          recommended: groupsOf(rows, "recommended"),
        });
      }),
  };
}
