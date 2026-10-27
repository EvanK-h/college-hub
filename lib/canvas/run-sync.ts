import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminEnv, getCanvasEnv } from "@/lib/env.server";
import { createCanvasClient } from "./client";
import type { SyncOutcome } from "@/lib/sync/runs";
import { syncCanvas } from "./sync";

/** Builds the real clients from the environment and runs one full Canvas sync (or skips it). */
export async function runCanvasSync(): Promise<SyncOutcome> {
  const canvasEnv = getCanvasEnv();
  const { OWNER_ID } = getAdminEnv();

  return syncCanvas({
    db: createAdminClient(),
    canvas: createCanvasClient({ baseUrl: canvasEnv.CANVAS_BASE_URL, token: canvasEnv.CANVAS_TOKEN }),
    ownerId: OWNER_ID,
  });
}
