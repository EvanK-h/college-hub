"use server";

import { revalidatePath } from "next/cache";
import { runCanvasSync } from "@/lib/canvas/run-sync";
import { coursePath } from "@/lib/courses/slug";
import { getTimetableFeedUrl } from "@/lib/env.server";
import { searchPattern, type SearchResult } from "@/lib/search/search";
import { createClient } from "@/lib/supabase/server";
import { isStale } from "@/lib/sync/format";
import { formatDay } from "@/lib/timetable/format";
import { runTimetableSync } from "@/lib/timetable/run-sync";
import { parseNewTodo, parseRestoredTodo, parseTodoId, parseTodoToggle, type RestoredTodo } from "@/lib/todos/form";

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

/** Deletes a to-do and returns the row, so the toast's Undo can put it back (restoreTodo). */
export async function deleteTodo(formData: FormData): Promise<RestoredTodo | null> {
  const parsed = parseTodoId(formData);
  if (!parsed.success) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.from("todos").delete().eq("id", parsed.data).select("id, title, course_id, due_on, created_at").maybeSingle();
  if (error) throw new Error("Could not delete the to-do.");
  revalidatePath("/");
  return data;
}

/** Undo for a delete: inserts the same row again, with its id and creation time. */
export async function restoreTodo(input: unknown): Promise<void> {
  const parsed = parseRestoredTodo(input);
  if (!parsed.success) return;
  const supabase = await createClient();

  // As in addTodo: reading the course through RLS proves it is yours.
  if (parsed.data.course_id) {
    const { data: course } = await supabase.from("courses").select("id").eq("id", parsed.data.course_id).maybeSingle();
    if (!course) return;
  }

  const { error } = await supabase.from("todos").insert(parsed.data);
  if (error) throw new Error("Could not restore the to-do.");
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

const RESULTS_PER_KIND = 5;

/**
 * ⌘K search over courses, assignments and announcements (pages are matched in the browser).
 * Read with the user's session, so RLS limits it to your own data. Each result links into the
 * app: a course to its page, an assignment to its course page's assignments, an announcement to
 * itself on its course page (opened there by OpenAnnouncementFromHash).
 */
export async function search(query: string): Promise<SearchResult[]> {
  const pattern = typeof query === "string" ? searchPattern(query.slice(0, 100)) : null;
  if (!pattern) return [];

  const supabase = await createClient();
  const [courses, assignments, announcements] = await Promise.all([
    supabase.from("courses").select("id, code, title, terms(name)").or(`code.ilike.${pattern},title.ilike.${pattern}`).order("code").limit(RESULTS_PER_KIND),
    supabase
      .from("assignments")
      .select("id, title, due_at, courses(code, terms(time_zone))")
      .ilike("title", pattern)
      .eq("deleted_in_canvas", false)
      .order("due_at", { ascending: false, nullsFirst: false })
      .limit(RESULTS_PER_KIND),
    supabase
      .from("announcements")
      .select("id, title, posted_at, courses(code, terms(time_zone))")
      .ilike("title", pattern)
      .eq("deleted_in_canvas", false)
      .order("posted_at", { ascending: false, nullsFirst: false })
      .limit(RESULTS_PER_KIND),
  ]);

  const results: SearchResult[] = [];
  for (const course of courses.data ?? []) {
    results.push({ id: course.id, kind: "course", label: `${course.code} · ${course.title}`, detail: course.terms?.name ?? "", href: coursePath(course.code) });
  }
  for (const item of assignments.data ?? []) {
    if (!item.courses) continue;
    const due = item.due_at ? `due ${formatDay(new Date(item.due_at), item.courses.terms?.time_zone ?? "UTC")}` : "no due date";
    results.push({ id: item.id, kind: "assignment", label: item.title, detail: `${item.courses.code}, ${due}`, href: `${coursePath(item.courses.code)}#assignments-heading` });
  }
  for (const item of announcements.data ?? []) {
    if (!item.courses) continue;
    results.push({ id: item.id, kind: "announcement", label: item.title, detail: item.courses.code, href: `${coursePath(item.courses.code)}#announcement-${item.id}` });
  }
  return results;
}
