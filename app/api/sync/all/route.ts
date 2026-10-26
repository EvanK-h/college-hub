import { isCronAuthorized } from "@/lib/auth/cron";
import { runCanvasSync } from "@/lib/canvas/run-sync";
import { getCronSecret } from "@/lib/env.server";

// A sync of a few courses is a handful of sequential Canvas calls; this leaves room for retries.
export const maxDuration = 60;

// The only entry point to the Canvas sync for cron callers. The proxy lets /api/sync/* through
// without a session, so this check is the only thing standing between the internet and Canvas.
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

  try {
    const result = await runCanvasSync();
    // Non-2xx on a failed or token-expired run, so Vercel Cron shows it as failed. A skipped run
    // (another sync was already going) is fine: that sync is doing the work.
    const ok = result.status === "success" || result.status === "skipped";
    return Response.json(result, { status: ok ? 200 : 502 });
  } catch (error) {
    console.error("Canvas sync crashed:", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: "sync failed" }, { status: 500 });
  }
}

// Vercel Cron and pg_net both call this with GET; POST is the same handler.
export const GET = handle;
export const POST = handle;
