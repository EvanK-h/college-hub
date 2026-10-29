"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseSwapCourse } from "@/lib/plans/build";
import { parseNewPlan, parsePlanMove, parsePlanSwap, parseRenamePlan, parseSwapChoice } from "@/lib/plans/forms";
import { createClient } from "@/lib/supabase/server";

// What-if plan actions. All use the user's session client, so RLS applies: another owner's plan
// or course matches no row. None of them touch the real plan except applyPlan.

export type PlanFormState = { status: "idle" | "saved" | "error"; message: string };

const UNIQUE_VIOLATION = "23505";

export async function createPlan(_previous: PlanFormState, formData: FormData): Promise<PlanFormState> {
  const parsed = parseNewPlan(formData);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the form." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_plan", {
    p_name: parsed.data.name,
    ...(parsed.data.from === "current" ? {} : { p_from: parsed.data.from }),
  });
  if (error) {
    return { status: "error", message: error.code === UNIQUE_VIOLATION ? "You already have a plan with that name." : "Could not save the plan. Try again." };
  }
  revalidatePath("/pathway/plans");
  redirect(`/pathway/plans/${data}`);
}

export async function renamePlan(_previous: PlanFormState, formData: FormData): Promise<PlanFormState> {
  const parsed = parseRenamePlan(formData);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the name." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("plans").update({ name: parsed.data.name }).eq("id", parsed.data.planId).select("id");
  if (error) {
    return { status: "error", message: error.code === UNIQUE_VIOLATION ? "You already have a plan with that name." : "Could not rename the plan. Try again." };
  }
  if (data.length === 0) return { status: "error", message: "That plan could not be found." };
  revalidatePath("/pathway/plans");
  revalidatePath(`/pathway/plans/${parsed.data.planId}`);
  return { status: "saved", message: "" };
}

export async function deletePlan(planId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("plans").delete().eq("id", planId);
  if (error) throw new Error("Could not delete the plan.");
  revalidatePath("/pathway/plans");
  redirect("/pathway/plans");
}

/** A drag on a plan's board: a course gets (or updates) its row, a swap moves its own row. */
export async function movePlanItem(planId: string, move: { courseId: string; termId: number }): Promise<{ ok: boolean }> {
  const parsed = parsePlanMove({ planId, ...move });
  if (!parsed.success) return { ok: false };
  const { courseId: itemId, termId } = parsed.data;

  const supabase = await createClient();
  const { error } = itemId.startsWith("swap:")
    ? await supabase.from("plan_courses").update({ term_id: termId }).eq("plan_id", planId).eq("swap_option_id", itemId.slice(5))
    : await supabase.from("plan_courses").upsert({ plan_id: planId, course_id: itemId, term_id: termId }, { onConflict: "plan_id,course_id" });
  if (error) return { ok: false };

  revalidatePath(`/pathway/plans/${planId}`);
  return { ok: true };
}

/** Takes a swap into a what-if plan from the plan page's form (see insertSwap). */
export async function addPlanSwap(_previous: PlanFormState, formData: FormData): Promise<PlanFormState> {
  const parsed = parsePlanSwap(formData);
  if (!parsed.success) return { status: "error", message: "Choose a swap." };
  const { planId, choice } = parsed.data;

  const message = await insertSwap(planId, choice);
  if (message) return { status: "error", message };
  revalidatePath(`/pathway/plans/${planId}`);
  return { status: "idle", message: "" };
}

/**
 * The swaps page's "Try in a what-if plan": opens the plan named after the swap ("Try PHIL 1115"),
 * or makes it from the real plan with the swap taken in. A plan that couldn't take the swap is
 * deleted again, so a failure leaves nothing behind.
 */
export async function trySwap(formData: FormData): Promise<void> {
  const parsed = parseSwapChoice(formData);
  if (!parsed.success) throw new Error("Choose a swap.");
  const choice = parsed.data;

  const supabase = await createClient();
  const { data: swap } = await supabase.from("swap_options").select("swap_in").eq("id", choice.swapOptionId).maybeSingle();
  const code = swap && parseSwapCourse(swap.swap_in)?.code;
  if (!code) throw new Error("That swap can't go into a plan.");
  const name = `Try ${code}`;

  const { data: existing } = await supabase.from("plans").select("id").eq("name", name).maybeSingle();
  if (existing) redirect(`/pathway/plans/${existing.id}`);

  const { data: planId, error } = await supabase.rpc("create_plan", { p_name: name });
  if (error) throw new Error("Could not make the plan. Try again.");
  const message = await insertSwap(planId, choice);
  if (message) {
    await supabase.from("plans").delete().eq("id", planId);
    throw new Error(message);
  }
  revalidatePath("/pathway/plans");
  redirect(`/pathway/plans/${planId}`);
}

/**
 * Takes a swap into a plan in place of one course. The swap starts in that course's term, and
 * must be one of the swap's listed replacements and a single course, so it can be applied later.
 * Returns what went wrong, or null.
 */
async function insertSwap(planId: string, choice: { swapOptionId: string; courseId: string }): Promise<string | null> {
  const supabase = await createClient();
  const [swap, link, course, row] = await Promise.all([
    supabase.from("swap_options").select("swap_in").eq("id", choice.swapOptionId).maybeSingle(),
    supabase.from("swap_replaces").select("course_id").eq("swap_option_id", choice.swapOptionId).eq("course_id", choice.courseId).maybeSingle(),
    supabase.from("courses").select("term_id, status").eq("id", choice.courseId).maybeSingle(),
    supabase.from("plan_courses").select("term_id").eq("plan_id", planId).eq("course_id", choice.courseId).maybeSingle(),
  ]);
  if (!swap.data || !link.data || course.data?.status !== "planned" || !parseSwapCourse(swap.data.swap_in)) {
    return "That swap can't replace that course.";
  }

  const { error } = await supabase.from("plan_courses").insert({
    plan_id: planId,
    swap_option_id: choice.swapOptionId,
    replaces_course_id: choice.courseId,
    term_id: row.data?.term_id ?? course.data.term_id,
  });
  if (error) return error.code === UNIQUE_VIOLATION ? "That swap or course is already swapped in this plan." : "Could not add the swap. Try again.";
  return null;
}

export async function removePlanSwap(planId: string, swapOptionId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("plan_courses").delete().eq("plan_id", planId).eq("swap_option_id", swapOptionId);
  if (error) throw new Error("Could not remove the swap.");
  revalidatePath(`/pathway/plans/${planId}`);
}

/** Makes a plan the real plan (see apply_plan in the create_plans migration). */
export async function applyPlan(planId: string): Promise<PlanFormState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("apply_plan", { p_plan: planId });
  if (error) return { status: "error", message: `Nothing was changed: ${error.message}.` };

  for (const path of ["/pathway", "/pathway/requirements", "/pathway/swaps", "/pathway/graph", "/pathway/plans"]) revalidatePath(path);
  redirect("/pathway");
}
