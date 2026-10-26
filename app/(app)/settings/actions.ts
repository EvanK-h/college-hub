"use server";

import { revalidatePath } from "next/cache";
import { parseCourseLink } from "@/lib/canvas/course-links";
import { createClient } from "@/lib/supabase/server";

export type CourseLinkState = {
  status: "idle" | "saved" | "error";
  message: string;
};

const UNIQUE_VIOLATION = "23505";

export async function linkCourse(_previous: CourseLinkState, formData: FormData): Promise<CourseLinkState> {
  const parsed = parseCourseLink(formData);
  if (!parsed.success) {
    return { status: "error", message: "Choose a course from the list." };
  }
  const { courseId, canvasCourseId } = parsed.data;

  // The user's session client, so RLS applies: a course that is not yours matches no row.
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .update({ canvas_course_id: canvasCourseId })
    .eq("id", courseId)
    .select("id");

  if (error?.code === UNIQUE_VIOLATION) {
    // canvas_course_id is unique, so one Canvas course can only back one course here.
    const { data: other } = await supabase
      .from("courses")
      .select("code")
      .eq("canvas_course_id", canvasCourseId)
      .maybeSingle();
    return {
      status: "error",
      message: other ? `That Canvas course is already linked to ${other.code}.` : "That Canvas course is already linked.",
    };
  }
  if (error) {
    return { status: "error", message: "Could not save the link. Try again." };
  }
  if (data.length === 0) {
    return { status: "error", message: "That course could not be found." };
  }

  revalidatePath("/settings");
  return { status: "saved", message: canvasCourseId === null ? "Unlinked." : "Linked." };
}
