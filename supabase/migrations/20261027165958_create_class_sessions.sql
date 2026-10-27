-- Phase 3: the timetable. One row per dated class, lab, seminar or exam from the Outlook/Celcat
-- ICS feed, plus the function the timetable sync writes through.
--
-- A session is identified the way iCalendar identifies it: the event's UID plus its RECURRENCE-ID.
-- A one-off event has no RECURRENCE-ID (null here), so its UID alone is its identity. An occurrence
-- of a repeating event uses its original start, even after it has been moved. Either way, a class
-- moved to another time or room is the same row with new values, not a cancellation plus a new row,
-- so your edits to it survive.

create type session_type as enum ('lecture','lab','seminar','tutorial','workshop','exam','other');

create table class_sessions (
  id               uuid primary key default gen_random_uuid(),
  ics_uid          text not null,
  recurrence_id    timestamptz,                -- null for a one-off event; see above
  course_id        uuid not null references courses(id) on delete cascade,
  kind             session_type not null,      -- guessed on first insert, then yours to correct
  title            text not null,
  starts_at        timestamptz not null,
  ends_at          timestamptz not null,
  location         text,
  -- synced
  cancelled        boolean not null default false,
  synced_at        timestamptz not null default now(),
  -- yours: the sync never writes this after insert
  is_new           boolean not null default true,
  owner_id         uuid not null default auth.uid(),
  unique nulls not distinct (owner_id, ics_uid, recurrence_id),
  check (ends_at >= starts_at)
);

create index class_sessions_starts_at_idx on class_sessions (starts_at);
create index class_sessions_course_id_idx on class_sessions (course_id);

alter table class_sessions enable row level security;
create policy "owner only" on class_sessions for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Upserts the sessions in p_rows, then marks cancelled any session starting in
-- [p_cancel_from, p_cancel_to] that is no longer in the feed (never deleted, matching the Canvas
-- rule). A session that reappears is un-cancelled unless the feed itself says it is cancelled.
-- Only call this with a fully parsed feed.
create function sync_class_sessions(p_owner uuid, p_rows jsonb, p_cancel_from timestamptz, p_cancel_to timestamptz)
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
    where not exists (select 1 from courses c where c.id = r.course_id and c.owner_id = p_owner)
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

-- Like the Canvas functions: it writes for any owner it is given, so only the service role may call it.
revoke execute on function sync_class_sessions(uuid, jsonb, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function sync_class_sessions(uuid, jsonb, timestamptz, timestamptz) to service_role;
