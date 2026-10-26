import "server-only";
import { getCanvasEnv } from "@/lib/env.server";
import { CanvasAuthError, createCanvasClient } from "./client";
import type { CanvasCourse } from "./schemas";

export type CanvasCourseList = { ok: true; courses: CanvasCourse[] } | { ok: false; reason: string };

/**
 * Your active Canvas courses, for the settings page's link dropdowns. It never throws: the page
 * shows `reason` instead, so a missing or expired token can't break /settings (where you'd fix it).
 * The reasons are fixed phrases, so nothing from Canvas or the environment reaches the page.
 */
export async function loadCanvasCourses(): Promise<CanvasCourseList> {
  let client;
  try {
    const env = getCanvasEnv();
    client = createCanvasClient({ baseUrl: env.CANVAS_BASE_URL, token: env.CANVAS_TOKEN });
  } catch {
    return { ok: false, reason: "CANVAS_BASE_URL or CANVAS_TOKEN isn't set" };
  }

  try {
    return { ok: true, courses: await client.listActiveCourses() };
  } catch (error) {
    if (error instanceof CanvasAuthError) return { ok: false, reason: "the Canvas token has expired" };
    return { ok: false, reason: "Canvas could not be reached" };
  }
}
