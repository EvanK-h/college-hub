"use server";

import { revalidatePath } from "next/cache";
import { parseAnnouncementFlag, parseAssignmentProgress, parseCourseNotes } from "@/lib/courses/forms";
import { createClient } from "@/lib/supabase/server";

export type NotesState = { status: "idle" | "saved" | "error"; message: string };

// Every action uses the user's session client, so RLS applies: a row that is not yours matches
// nothing. Each one writes only columns that are yours; the sync owns the rest.

export async function saveCourseNotes(_previous: NotesState, formData: FormData): Promise<NotesState> {
  const parsed = parseCourseNotes(formData);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Could not read the notes." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .update({ notes: parsed.data.notes })
    .eq("id", parsed.data.courseId)
    .select("code");
  if (error) return { status: "error", message: "Could not save the notes. Try again." };
  if (data.length === 0) return { status: "error", message: "That course could not be found." };

  revalidatePath("/(app)/courses/[code]", "page");
  return { status: "saved", message: "Saved." };
}

export async function setAnnouncementFlag(formData: FormData): Promise<void> {
  const parsed = parseAnnouncementFlag(formData);
  if (!parsed.success) return;
  const { announcementId, flag, value } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("announcements")
    .update(flag === "read" ? { read: value } : { important: value })
    .eq("id", announcementId);
  if (error) throw new Error("Could not update the announcement.");
  revalidatePath("/(app)/courses/[code]", "page");
  revalidatePath("/");
}

export async function setAssignmentProgress(formData: FormData): Promise<void> {
  const parsed = parseAssignmentProgress(formData);
  if (!parsed.success) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("assignments")
    .update({ progress: parsed.data.progress })
    .eq("id", parsed.data.assignmentId);
  if (error) throw new Error("Could not update the assignment.");
  revalidatePath("/(app)/courses/[code]", "page");
  revalidatePath("/");
}
