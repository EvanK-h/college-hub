-- Phase 3: the personal calendar feed (/api/calendar/<token>), which a phone's calendar app
-- subscribes to without signing in.
--
-- Only a SHA-256 hash of the token is stored, so the table (or a backup of it) is not enough to
-- read the calendar. The token itself is shown once, when it is created; regenerating replaces it.

create table calendar_feeds (
  id         uuid primary key default gen_random_uuid(),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  owner_id   uuid not null default auth.uid() unique -- one feed per owner
);

alter table calendar_feeds enable row level security;
create policy "owner only" on calendar_feeds for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- The feed route has no session, and pages may not use the service-role key, so this function is
-- the one way in: given a token, it returns that owner's classes and deadlines as JSON, or null
-- for an unknown token. It runs with its owner's rights (security definer) to read past RLS, and
-- only ever for the owner the token belongs to.
create function calendar_feed(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
begin
  -- Tokens are 43 base64url characters; anything else can't match, so skip the lookup.
  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{43}$' then
    return null;
  end if;

  select owner_id into v_owner
  from public.calendar_feeds
  where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  if v_owner is null then
    return null;
  end if;

  return jsonb_build_object(
    'sessions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'kind', s.kind, 'starts_at', s.starts_at, 'ends_at', s.ends_at,
        'location', s.location, 'cancelled', s.cancelled, 'course_code', c.code, 'course_title', c.title
      ) order by s.starts_at)
      from public.class_sessions s
      join public.courses c on c.id = s.course_id
      where s.owner_id = v_owner
        and s.starts_at > now() - interval '60 days'
    ), '[]'::jsonb),
    'assignments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id, 'title', a.title, 'due_at', a.due_at, 'html_url', a.html_url, 'course_code', c.code
      ) order by a.due_at)
      from public.assignments a
      join public.courses c on c.id = a.course_id
      where a.owner_id = v_owner
        and not a.deleted_in_canvas
        and a.due_at > now() - interval '60 days'
    ), '[]'::jsonb)
  );
end;
$$;

-- Callable without a session: the token is the credential.
revoke execute on function calendar_feed(text) from public;
grant execute on function calendar_feed(text) to anon, authenticated;
