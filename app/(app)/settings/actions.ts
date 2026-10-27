"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { generateFeedToken } from "@/lib/calendar/token";
import { parseCourseLink } from "@/lib/canvas/course-links";
import { runCanvasSync } from "@/lib/canvas/run-sync";
import { getTimetableFeedUrl } from "@/lib/env.server";
import { createClient } from "@/lib/supabase/server";
import { describeSyncNow, type SyncNowState } from "@/lib/sync/format";
import { runTimetableSync } from "@/lib/timetable/run-sync";

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

  // Only linking can hit the unique constraint; unlinking (null) never does.
  if (error?.code === UNIQUE_VIOLATION && canvasCourseId !== null) {
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

/**
 * The "Sync now" button. The sync writes with the service-role key, which bypasses row-level
 * security, so the only thing that makes this safe to call is the session check below: it comes
 * first, and nothing else runs without it. (The route at /api/sync/all takes the cron bearer
 * token instead and never trusts a cookie.)
 */
export async function syncNow(): Promise<SyncNowState> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    return { status: "error", message: "You're signed out. Sign in again to sync." };
  }

  try {
    const canvas = await runCanvasSync();
    const timetable = getTimetableFeedUrl() ? await runTimetableSync() : null;
    revalidatePath("/settings");
    return describeSyncNow(canvas, timetable);
  } catch (error) {
    // The cause goes to the server log (message only); the page gets a fixed sentence.
    console.error("Sync now failed:", error instanceof Error ? error.message : "unknown error");
    return { status: "error", message: "The sync could not run. Check the server logs." };
  }
}

export type FeedLinkState = { status: "idle" | "created" | "error"; url: string | null; message: string };

/**
 * Creates the calendar feed link, or replaces it (the old link stops working at once). Only the
 * token's hash is stored, so this is the one moment the full link exists: it is returned to the
 * page to show once and is never written anywhere else.
 */
export async function createCalendarFeed(): Promise<FeedLinkState> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return { status: "error", url: null, message: "You're signed out. Sign in again." };

  const { token, hash } = generateFeedToken();
  // One row per owner: a new token replaces the old one. RLS applies through the session client.
  const { error } = await supabase.from("calendar_feeds").upsert({ token_hash: hash, created_at: new Date().toISOString() }, { onConflict: "owner_id" });
  if (error) return { status: "error", url: null, message: "Could not create the link. Try again." };

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  revalidatePath("/settings");
  return { status: "created", url: `${protocol}://${host}/api/calendar/${token}.ics`, message: "" };
}
