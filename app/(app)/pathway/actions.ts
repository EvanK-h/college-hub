"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { parseCourseMove, parseCourseUpdate } from "@/lib/pathway/course-update";
import { FOCUS_COOKIE, parseFocus } from "@/lib/pathway/focus";
import { createClient } from "@/lib/supabase/server";

export type CourseUpdateState = {
  status: "idle" | "saved" | "error";
  message: string;
};

export async function updateCourse(_previous: CourseUpdateState, formData: FormData): Promise<CourseUpdateState> {
  const parsed = parseCourseUpdate(formData);
  if (!parsed.success) {
    return { status: "error", message: "Choose a valid status and term." };
  }
  const { courseId, status, termId } = parsed.data;

  // The user's session client, so RLS applies: a course that is not yours matches no row.
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .update({ status, term_id: termId })
    .eq("id", courseId)
    .select("id");
  if (error) {
    return { status: "error", message: "Could not save the change. Try again." };
  }
  if (data.length === 0) {
    return { status: "error", message: "That course could not be found." };
  }

  // The pages are prerendered, so tell Next their data changed.
  revalidatePath("/pathway");
  revalidatePath("/pathway/requirements");
  return { status: "saved", message: "Saved." };
}

/**
 * Moves a planned course to another term from the drag-and-drop board. The prerequisite, co-op
 * and SH checks are advice shown before the drop is confirmed, so they are not enforced here.
 * Done and in-progress courses can't be dragged, and this refuses them too.
 */
export async function moveCourse(input: { courseId: string; termId: number }): Promise<{ ok: boolean }> {
  const parsed = parseCourseMove(input);
  if (!parsed.success) return { ok: false };

  // The user's session client, so RLS applies: a course that is not yours matches no row.
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .update({ term_id: parsed.data.termId })
    .eq("id", parsed.data.courseId)
    .eq("status", "planned")
    .select("id");
  if (error || data.length === 0) return { ok: false };

  revalidatePath("/pathway");
  revalidatePath("/pathway/requirements");
  return { ok: true };
}

/**
 * Saves the Quantum / AI focus. A preference, not data, so it lives in a cookie; setting a cookie
 * in a Server Action re-renders the current page with it.
 */
export async function setFocus(value: string): Promise<void> {
  const store = await cookies();
  store.set(FOCUS_COOKIE, parseFocus(value), { path: "/", sameSite: "lax", httpOnly: true, secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 365 });
}
