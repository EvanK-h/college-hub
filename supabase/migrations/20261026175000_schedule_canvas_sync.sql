-- Phase 2: run the Canvas sync every two hours from inside Supabase.
--
-- Vercel Cron only fires once a day on the Hobby plan, so pg_cron covers the rest of the day. It
-- calls the same route Vercel does (/api/sync/all) with the same bearer token. The route's
-- single-run guard means the two schedulers can never sync at the same time.
--
-- pg_cron is the clock; pg_net makes the HTTP request (asynchronously: the job doesn't wait for
-- the sync to finish). Supabase Vault stores the two values the request needs, so no secret is
-- ever written into a migration. In each environment, add them once in the SQL editor:
--
--   select vault.create_secret('https://your-app.vercel.app', 'sync_app_url');
--   select vault.create_secret('<the same CRON_SECRET Vercel has>', 'sync_cron_secret');
--
-- Until both exist the function does nothing, so a fresh local database stays quiet.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

create function trigger_canvas_sync()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url    text;
  v_secret text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'sync_app_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'sync_cron_secret';

  if v_url is null or v_secret is null then
    raise notice 'trigger_canvas_sync: vault secrets sync_app_url and sync_cron_secret are not both set; skipping';
    return null;
  end if;

  -- Returns the request id. The response lands in net._http_response (kept for about six hours),
  -- which is where to look if a scheduled run seems not to have happened.
  return net.http_get(
    url := rtrim(v_url, '/') || '/api/sync/all',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret),
    timeout_milliseconds := 60000
  );
end;
$$;

-- This function reads Vault with elevated rights (security definer), so only the cron job
-- (which runs as the table owner) may call it, never the public API.
revoke execute on function trigger_canvas_sync() from public, anon, authenticated;

-- 07:00 to 23:00 every two hours. pg_cron runs in UTC, like Vercel Cron.
-- Scheduling by name replaces any existing job with that name, so re-running this is safe.
select cron.schedule('canvas-sync', '0 7-23/2 * * *', 'select public.trigger_canvas_sync()');
