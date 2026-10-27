import "server-only";
import { getCanvasEnv } from "@/lib/env.server";

/**
 * Canvas's own settings page, where access tokens are created ("+ New Access Token"). Null when
 * CANVAS_BASE_URL isn't set, so a missing variable hides the link instead of breaking the page.
 */
export function canvasSettingsUrl(): string | null {
  try {
    return `${new URL(getCanvasEnv().CANVAS_BASE_URL).origin}/profile/settings`;
  } catch {
    return null;
  }
}

/** The course's home page in Canvas, or null when CANVAS_BASE_URL isn't set. */
export function canvasCourseUrl(canvasCourseId: number): string | null {
  try {
    return `${new URL(getCanvasEnv().CANVAS_BASE_URL).origin}/courses/${canvasCourseId}`;
  } catch {
    return null;
  }
}
