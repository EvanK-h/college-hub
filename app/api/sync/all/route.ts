import { isCronAuthorized } from "@/lib/auth/cron";
import { runCanvasSync } from "@/lib/canvas/run-sync";
import { getCronSecret } from "@/lib/env.server";
import type { SyncOutcome } from "@/lib/sync/runs";
import { runTimetableSync } from "@/lib/timetable/run-sync";

// A sync of a few courses is a handful of sequential Canvas calls plus one feed download; this
// leaves room for retries.
export const maxDuration = 60;

type SourceOutcome = SyncOutcome | { status: "crashed" };

/** Runs one source's sync. A throw is logged (message only) and reported without its text. */
async function runSource(name: string, run: () => Promise<SyncOutcome>): Promise<SourceOutcome> {
  try {
    return await run();
  } catch (error) {
    console.error(`${name} sync crashed:`, error instanceof Error ? error.message : "unknown error");
    return { status: "crashed" };
  }
}

// The only entry point to the syncs for cron callers. The proxy lets /api/sync/* through without
// a session, so this check is the only thing standing between the internet and Canvas.
async function handle(request: Request): Promise<Response> {
  let secret: string;
  try {
    secret = getCronSecret();
  } catch (error) {
    // Fail closed. The message names the variable, never its value.
    console.error("Sync route is not configured:", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: "sync is not configured" }, { status: 500 });
  }

  if (!isCronAuthorized(request.headers.get("authorization"), secret)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  // One after the other, and the timetable runs even if Canvas failed: they are independent.
  const canvas = await runSource("Canvas", runCanvasSync);
  const timetable = await runSource("Timetable", runTimetableSync);
  const statuses = [canvas.status, timetable.status];

  // Non-2xx when any source failed, so Vercel Cron shows the run as failed. A skipped source
  // (another run is going, or the timetable isn't configured) is fine.
  const status = statuses.includes("crashed")
    ? 500
    : statuses.every((s) => s === "success" || s === "skipped")
      ? 200
      : 502;
  return Response.json({ canvas, timetable }, { status });
}

// Vercel Cron and pg_net both call this with GET; POST is the same handler.
export const GET = handle;
export const POST = handle;
