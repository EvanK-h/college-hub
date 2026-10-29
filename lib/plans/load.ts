import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { PlanPrereq, PlanTerm } from "@/lib/pathway/move-checks";
import { PATHWAY_COURSE_COLUMNS, summarizeTerms, type TermSummary } from "@/lib/pathway/summarize";
import { buildPlan, type PlanItem, type PlanRow, type RealCourse, type SwapChoice } from "./build";

export type SwapOffer = SwapChoice & { slotId: string; replaces: string[] };

/** Everything the plan pages share: terms, the real courses, prerequisites and swap options. */
export async function loadPlanning(supabase: SupabaseClient<Database>) {
  const [termsResult, coursesResult, prereqsResult, swapsResult, linksResult] = await Promise.all([
    supabase.from("terms").select("id, name, kind").order("id"),
    supabase.from("courses").select(`${PATHWAY_COURSE_COLUMNS}, term_id`),
    supabase.from("course_prereqs").select("course_id, requires_code, kind, option_group"),
    supabase.from("swap_options").select("id, swap_in, slot_id").order("swap_in"),
    supabase.from("swap_replaces").select("swap_option_id, course_id"),
  ]);
  for (const result of [termsResult, coursesResult, prereqsResult, swapsResult, linksResult]) {
    if (result.error) throw new Error(`Loading the plan failed: ${result.error.message}`);
  }

  const terms: PlanTerm[] = termsResult.data ?? [];
  const courses: RealCourse[] = (coursesResult.data ?? []).map(({ term_id, ...course }) => ({ ...course, termId: term_id }));
  const prereqs: PlanPrereq[] = (prereqsResult.data ?? []).map((row) => ({
    courseId: row.course_id,
    requiresCode: row.requires_code,
    kind: row.kind,
    group: row.option_group,
  }));
  const links = linksResult.data ?? [];
  const swaps: SwapOffer[] = (swapsResult.data ?? []).map((swap) => ({
    id: swap.id,
    swapIn: swap.swap_in,
    slotId: swap.slot_id,
    replaces: links.filter((link) => link.swap_option_id === swap.id).map((link) => link.course_id),
  }));
  return { terms, courses, prereqs, swaps };
}

export type Planning = Awaited<ReturnType<typeof loadPlanning>>;

/** A plan's rows, or null if there is no such plan (or it isn't yours). */
export async function loadPlanRows(supabase: SupabaseClient<Database>, planId: string) {
  const [planResult, rowsResult] = await Promise.all([
    supabase.from("plans").select("id, name, created_at").eq("id", planId).maybeSingle(),
    supabase.from("plan_courses").select("term_id, course_id, swap_option_id, replaces_course_id").eq("plan_id", planId),
  ]);
  if (planResult.error) throw new Error(`Loading the plan failed: ${planResult.error.message}`);
  if (rowsResult.error) throw new Error(`Loading the plan failed: ${rowsResult.error.message}`);
  if (!planResult.data) return null;
  const rows: PlanRow[] = rowsResult.data.map((row) => ({
    termId: row.term_id,
    courseId: row.course_id,
    swapOptionId: row.swap_option_id,
    replacesCourseId: row.replaces_course_id,
  }));
  return { plan: planResult.data, rows };
}

/** A plan's items grouped into board columns. */
export function planTerms(terms: readonly PlanTerm[], items: readonly PlanItem[]): TermSummary[] {
  return summarizeTerms(terms.map((term) => ({ ...term, courses: items.filter((item) => item.termId === term.id) })));
}

export { buildPlan };
