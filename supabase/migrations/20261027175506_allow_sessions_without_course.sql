-- Phase 3: keep every timed event from the Outlook feed, not only classes of courses in the plan
-- (optional workshops, Study Hub, talks, anything else on the calendar). A session's course is
-- now optional; events without one show their own title. See the 2026-10-27 decision.
-- create or replace keeps each function's existing grants.

alter table class_sessions alter column course_id drop not null;

-- Same as before, except that a row without a course skips the ownership check (there is no
-- course to check). A course id that is given must still belong to the owner.
create or replace function sync_class_sessions(p_owner uuid, p_rows jsonb, p_cancel_from timestamptz, p_cancel_to timestamptz)
returns table (inserted integer, updated integer, unchanged integer)
language plpgsql
set search_path = public
as $$
declare
  v_inserted  integer;
  v_updated   integer;
  v_cancelled integer;
begin
  if exists (
    select 1
    from jsonb_to_recordset(p_rows) as r(course_id uuid)
    where r.course_id is not null
      and not exists (select 1 from courses c where c.id = r.course_id and c.owner_id = p_owner)
  ) then
    raise exception 'a session refers to a course that does not belong to this owner';
  end if;

  with upserted as (
    insert into class_sessions as s (
      ics_uid, recurrence_id, course_id, kind, title, starts_at, ends_at, location, cancelled, owner_id
    )
    select r.ics_uid, r.recurrence_id, r.course_id, r.kind, r.title, r.starts_at, r.ends_at,
           r.location, r.cancelled, p_owner
    from jsonb_to_recordset(p_rows) as r(
      ics_uid text, recurrence_id timestamptz, course_id uuid, kind session_type, title text,
      starts_at timestamptz, ends_at timestamptz, location text, cancelled boolean
    )
    on conflict (owner_id, ics_uid, recurrence_id) do update
      -- Synced columns only. Not listed on purpose: kind, is_new.
      set course_id = excluded.course_id,
          title = excluded.title,
          starts_at = excluded.starts_at,
          ends_at = excluded.ends_at,
          location = excluded.location,
          cancelled = excluded.cancelled,
          synced_at = now()
      where s.owner_id = p_owner
        and (s.course_id, s.title, s.starts_at, s.ends_at, s.location, s.cancelled)
            is distinct from
            (excluded.course_id, excluded.title, excluded.starts_at, excluded.ends_at,
             excluded.location, excluded.cancelled)
    returning (xmax = 0) as was_inserted -- xmax is 0 only on a freshly inserted row
  )
  select count(*) filter (where was_inserted), count(*) filter (where not was_inserted)
  into v_inserted, v_updated
  from upserted;

  update class_sessions s
  set cancelled = true, synced_at = now()
  where s.owner_id = p_owner
    and not s.cancelled
    and s.starts_at between p_cancel_from and p_cancel_to
    and not exists (
      select 1
      from jsonb_to_recordset(p_rows) as r(ics_uid text, recurrence_id timestamptz)
      where r.ics_uid = s.ics_uid and r.recurrence_id is not distinct from s.recurrence_id
    );
  get diagnostics v_cancelled = row_count;

  return query select
    v_inserted,
    v_updated + v_cancelled,
    jsonb_array_length(p_rows) - v_inserted - v_updated;
end;
$$;


-- Same as before, with a left join so sessions without a course are included, plus each session's
-- own title for events that have no course code.
create or replace function calendar_feed(p_token text)
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
        'id', s.id, 'kind', s.kind, 'title', s.title, 'starts_at', s.starts_at, 'ends_at', s.ends_at,
        'location', s.location, 'cancelled', s.cancelled, 'course_code', c.code, 'course_title', c.title
      ) order by s.starts_at)
      from public.class_sessions s
      left join public.courses c on c.id = s.course_id -- events without a course are in the feed too
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

