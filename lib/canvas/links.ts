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
