"use server";

import { revalidatePath } from "next/cache";
import { runCanvasSync } from "@/lib/canvas/run-sync";
import { getTimetableFeedUrl } from "@/lib/env.server";
import { createClient } from "@/lib/supabase/server";
import { isStale } from "@/lib/sync/format";
import { runTimetableSync } from "@/lib/timetable/run-sync";
import { parseNewTodo, parseTodoId, parseTodoToggle } from "@/lib/todos/form";

export type TodoFormState = {
  status: "idle" | "saved" | "error";
  message: string;
};

// Every action uses the user's session client, so RLS applies: a to-do that is not yours matches no row.

export async function addTodo(_previous: TodoFormState, formData: FormData): Promise<TodoFormState> {
  const parsed = parseNewTodo(formData);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the to-do and try again." };
  }
  const { title, courseId, dueOn } = parsed.data;
  const supabase = await createClient();

  // The foreign key would accept any course's id; reading it through RLS proves it is yours.
  if (courseId) {
    const { data: course } = await supabase.from("courses").select("id").eq("id", courseId).maybeSingle();
    if (!course) return { status: "error", message: "That course could not be found." };
  }

  const { error } = await supabase.from("todos").insert({ title, course_id: courseId, due_on: dueOn });
  if (error) return { status: "error", message: "Could not add the to-do. Try again." };

  revalidatePath("/");
  return { status: "saved", message: "Added." };
}

export async function setTodoDone(formData: FormData): Promise<void> {
  const parsed = parseTodoToggle(formData);
  if (!parsed.success) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("todos")
    .update({ done_at: parsed.data.done ? new Date().toISOString() : null })
    .eq("id", parsed.data.todoId);
  if (error) throw new Error("Could not update the to-do.");
  revalidatePath("/");
}

export async function deleteTodo(formData: FormData): Promise<void> {
  const parsed = parseTodoId(formData);
  if (!parsed.success) return;

  const supabase = await createClient();
  const { error } = await supabase.from("todos").delete().eq("id", parsed.data);
  if (error) throw new Error("Could not delete the to-do.");
  revalidatePath("/");
}

/**
 * Called by the dashboard when it opens. Syncs Canvas and the timetable if the last successful
 * Canvas sync is more than 30 minutes old. The sync writes with the service role, so the session
 * check comes first, and staleness is read from the database here rather than trusted from the
 * browser: calling this repeatedly can't make it sync more than once per half hour.
 */
export async function syncIfStale(): Promise<{ synced: boolean }> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) return { synced: false };

  const { data: lastSuccess } = await supabase
    .from("sync_runs")
    .select("finished_at")
    .eq("source", "canvas")
    .eq("status", "success")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!isStale(lastSuccess?.finished_at ?? null, new Date())) return { synced: false };

  try {
    await runCanvasSync();
    if (getTimetableFeedUrl()) await runTimetableSync();
  } catch (error) {
    // The run itself is recorded in sync_runs; the dashboard just keeps showing cached data.
    console.error("Dashboard sync failed:", error instanceof Error ? error.message : "unknown error");
    return { synced: false };
  }
  revalidatePath("/");
  return { synced: true };
}
