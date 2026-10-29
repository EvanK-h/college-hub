import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { toProfile, type AreaInfo, type AttributeInfo, type CourseTypeInfo, type FocusInfo, type Profile, type SlotInfo } from "./setup";

export type Setup = {
  profile: Profile;
  courseTypes: CourseTypeInfo[];
  areas: AreaInfo[];
  slots: SlotInfo[];
  attributes: AttributeInfo[];
  focuses: FocusInfo[];
};

/**
 * The signed-in user's setup, read with their session (RLS applies). Wrapped in React's cache, so
 * every component that needs it in one request shares a single set of queries.
 */
export const loadSetup = cache(async (): Promise<Setup> => {
  const supabase = await createClient();
  const [profile, types, areas, slots, attributes, focuses] = await Promise.all([
    supabase.from("profiles").select("school, credit_unit, attribute_set_name, grade_scale, credit_limits").maybeSingle(),
    supabase.from("course_types").select("id, name, color, coop").order("position").order("name"),
    supabase.from("requirement_areas").select("id, name, headline").order("position").order("name"),
    supabase.from("swap_slots").select("id, name").order("position").order("name"),
    supabase.from("attributes").select("id, code, name, required").order("position").order("code"),
    supabase.from("focuses").select("id, name, goal_code").order("position").order("name"),
  ]);
  for (const result of [profile, types, areas, slots, attributes, focuses]) {
    if (result.error) throw new Error(`Loading your setup failed: ${result.error.message}`);
  }

  return {
    profile: toProfile(profile.data),
    courseTypes: types.data ?? [],
    areas: areas.data ?? [],
    slots: slots.data ?? [],
    attributes: attributes.data ?? [],
    focuses: (focuses.data ?? []).map(({ goal_code, ...focus }) => ({ ...focus, goalCode: goal_code })),
  };
});
