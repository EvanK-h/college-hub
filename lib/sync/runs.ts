import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type Db = SupabaseClient<Database>;
type SyncSource = Database["public"]["Enums"]["sync_source"];
type SyncStatus = Database["public"]["Enums"]["sync_status"];

export type SyncCounts = { inserted: number; updated: number; unchanged: number };

export type SyncResult = {
  runId: string;
  status: Exclude<SyncStatus, "running">;
  counts: SyncCounts;
  /** A short reason for `error` and `token_expired`; never headers, tokens or URLs. */
  error: string | null;
};

/** Another sync of the same source is already running, so this one did nothing and wrote no `sync_runs` row. */
export type SyncSkipped = { status: "skipped"; reason: string };

export type SyncOutcome = SyncResult | SyncSkipped;

/** What a sync's own work reports back to `withSyncRun`. */
export type SyncWork = { status: SyncResult["status"]; counts: SyncCounts; failures: string[] };

const MAX_ERROR_LENGTH = 500;
// A run still marked `running` after this long crashed or timed out, and must not block new ones.
const STALE_RUN_MINUTES = 10;
const UNIQUE_VIOLATION = "23505";

export const NO_COUNTS: SyncCounts = { inserted: 0, updated: 0, unchanged: 0 };

export function addCounts(a: SyncCounts, b: SyncCounts): SyncCounts {
  return {
    inserted: a.inserted + b.inserted,
    updated: a.updated + b.updated,
    unchanged: a.unchanged + b.unchanged,
  };
}

export function describeError(error: unknown): string {
  const message = error instanceof Error ? error.message : "unknown error";
  return message.slice(0, MAX_ERROR_LENGTH);
}

/**
 * Runs `work` as one recorded sync of `source`: it closes stale runs, takes the one-running-run
 * lock (the partial unique index on `sync_runs`), and writes the outcome when `work` finishes.
 * If another run of the same source holds the lock it returns `skipped` without calling `work`.
 * A throw from `work` is recorded as an `error` run.
 */
export async function withSyncRun(
  db: Db,
  { ownerId, source, now }: { ownerId: string; source: SyncSource; now: Date },
  work: () => Promise<SyncWork>,
): Promise<SyncOutcome> {
  // First close out runs that never finished, so a crash can't block syncing forever.
  const staleBefore = new Date(now.getTime() - STALE_RUN_MINUTES * 60 * 1000);
  const { error: staleError } = await db
    .from("sync_runs")
    .update({
      status: "error",
      finished_at: now.toISOString(),
      error_message: "run did not finish (it timed out or crashed)",
    })
    .eq("owner_id", ownerId)
    .eq("source", source)
    .eq("status", "running")
    .lt("started_at", staleBefore.toISOString());
  if (staleError) throw new Error(`could not close stale sync runs: ${staleError.message}`);

  // The unique index on running rows makes this insert the lock: only one run can hold it.
  const { data: run, error: runError } = await db
    .from("sync_runs")
    .insert({ source, status: "running", owner_id: ownerId })
    .select("id")
    .single();
  if (runError?.code === UNIQUE_VIOLATION) return { status: "skipped", reason: "another sync is already running" };
  if (runError) throw new Error(`could not record the sync run: ${runError.message}`);

  let result: SyncWork;
  try {
    result = await work();
  } catch (error) {
    result = { status: "error", counts: NO_COUNTS, failures: [describeError(error)] };
  }

  const errorMessage = result.failures.length > 0 ? result.failures.join("; ").slice(0, MAX_ERROR_LENGTH) : null;

  const { error: finishError } = await db
    .from("sync_runs")
    .update({ status: result.status, finished_at: new Date().toISOString(), ...result.counts, error_message: errorMessage })
    .eq("id", run.id);
  if (finishError) throw new Error(`could not finish the sync run: ${finishError.message}`);

  return { runId: run.id, status: result.status, counts: result.counts, error: errorMessage };
}
