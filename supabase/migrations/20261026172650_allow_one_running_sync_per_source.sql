-- Phase 2: at most one sync per source can be running at a time.
--
-- Vercel Cron, pg_cron and the "Sync now" button can all fire close together. A partial unique
-- index (it only covers rows where status = 'running') lets the database settle the race: the
-- second run's insert fails with a unique violation and the sync reports "skipped" instead of
-- sending parallel requests to Canvas, which throttles them harder.
create unique index sync_runs_one_running_per_source_idx
  on sync_runs (owner_id, source)
  where status = 'running';
