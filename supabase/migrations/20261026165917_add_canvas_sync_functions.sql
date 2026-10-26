-- Phase 2: the functions the Canvas sync calls to write its rows.
--
-- Each takes the owner, the course and a jsonb array of rows from Canvas, and runs
-- "insert ... on conflict (canvas_id) do update set <synced columns only>". The update list is
-- the guarantee that a re-sync never touches your columns: progress, priority, est_hours and
-- notes on assignments (and kind, which is guessed once on insert), and read and important on
-- announcements simply never appear in it.
--
-- Rows whose synced columns already match are skipped by the "where ... is distinct from" clause,
-- so each function can report how many rows were inserted, updated or left unchanged.
--
-- The sync uses the service-role key, which has no auth.uid(), so the owner is passed in explicitly.

create function sync_assignment_groups(p_owner uuid, p_course_id uuid, p_rows jsonb)
returns table (inserted integer, updated integer, unchanged integer)
language plpgsql
set search_path = public
as $$
declare
  v_inserted integer;
  v_updated  integer;
begin
  if not exists (select 1 from courses where id = p_course_id and owner_id = p_owner) then
    raise exception 'course % does not belong to this owner', p_course_id;
  end if;

  with upserted as (
    insert into assignment_groups as g (canvas_id, course_id, name, weight, position, owner_id)
    select r.canvas_id, p_course_id, r.name, r.weight, r.position, p_owner
    from jsonb_to_recordset(p_rows) as r(canvas_id bigint, name text, weight numeric, position integer)
    on conflict (canvas_id) do update
      set name = excluded.name,
          weight = excluded.weight,
          position = excluded.position,
          synced_at = now()
      where g.owner_id = p_owner
        and (g.name, g.weight, g.position)
            is distinct from (excluded.name, excluded.weight, excluded.position)
    returning (xmax = 0) as was_inserted -- xmax is 0 only on a freshly inserted row
  )
  select count(*) filter (where was_inserted), count(*) filter (where not was_inserted)
  into v_inserted, v_updated
  from upserted;

  return query select v_inserted, v_updated, jsonb_array_length(p_rows) - v_inserted - v_updated;
end;
$$;

-- Call this only after every page for the course has been fetched. Any assignment of the course
-- that is not in p_rows is marked deleted_in_canvas (never deleted, so your notes survive), and
-- one that reappears is un-marked. Rows marked deleted are counted as updated.
create function sync_assignments(p_owner uuid, p_course_id uuid, p_rows jsonb)
returns table (inserted integer, updated integer, unchanged integer)
language plpgsql
set search_path = public
as $$
declare
  v_inserted integer;
  v_updated  integer;
  v_deleted  integer;
begin
  if not exists (select 1 from courses where id = p_course_id and owner_id = p_owner) then
    raise exception 'course % does not belong to this owner', p_course_id;
  end if;

  with upserted as (
    insert into assignments as a (
      canvas_id, course_id, assignment_group_id, title, kind, due_at, points_possible,
      html_url, workflow_state, score, submitted_at, owner_id
    )
    select r.canvas_id, p_course_id, r.assignment_group_id, r.title, r.kind, r.due_at, r.points_possible,
           r.html_url, r.workflow_state, r.score, r.submitted_at, p_owner
    from jsonb_to_recordset(p_rows) as r(
      canvas_id bigint, assignment_group_id bigint, title text, kind assignment_kind,
      due_at timestamptz, points_possible numeric, html_url text,
      workflow_state text, score numeric, submitted_at timestamptz
    )
    on conflict (canvas_id) do update
      -- Synced columns only. Not listed on purpose: kind, progress, priority, est_hours, notes.
      set assignment_group_id = excluded.assignment_group_id,
          title = excluded.title,
          due_at = excluded.due_at,
          points_possible = excluded.points_possible,
          html_url = excluded.html_url,
          workflow_state = excluded.workflow_state,
          score = excluded.score,
          submitted_at = excluded.submitted_at,
          deleted_in_canvas = false,
          synced_at = now()
      where a.owner_id = p_owner
        and (a.assignment_group_id, a.title, a.due_at, a.points_possible, a.html_url,
             a.workflow_state, a.score, a.submitted_at, a.deleted_in_canvas)
            is distinct from
            (excluded.assignment_group_id, excluded.title, excluded.due_at, excluded.points_possible,
             excluded.html_url, excluded.workflow_state, excluded.score, excluded.submitted_at, false)
    returning (xmax = 0) as was_inserted
  )
  select count(*) filter (where was_inserted), count(*) filter (where not was_inserted)
  into v_inserted, v_updated
  from upserted;

  update assignments
  set deleted_in_canvas = true, synced_at = now()
  where course_id = p_course_id
    and owner_id = p_owner
    and not deleted_in_canvas
    and canvas_id <> all (
      select r.canvas_id from jsonb_to_recordset(p_rows) as r(canvas_id bigint)
    );
  get diagnostics v_deleted = row_count;

  return query select
    v_inserted,
    v_updated + v_deleted,
    jsonb_array_length(p_rows) - v_inserted - v_updated;
end;
$$;

-- Announcements are never marked deleted: the sync only asks Canvas for the last 60 days, so an
-- older announcement missing from the response doesn't mean it was removed.
create function sync_announcements(p_owner uuid, p_course_id uuid, p_rows jsonb)
returns table (inserted integer, updated integer, unchanged integer)
language plpgsql
set search_path = public
as $$
declare
  v_inserted integer;
  v_updated  integer;
begin
  if not exists (select 1 from courses where id = p_course_id and owner_id = p_owner) then
    raise exception 'course % does not belong to this owner', p_course_id;
  end if;

  with upserted as (
    insert into announcements as n (canvas_id, course_id, title, message, author, posted_at, html_url, owner_id)
    select r.canvas_id, p_course_id, r.title, r.message, r.author, r.posted_at, r.html_url, p_owner
    from jsonb_to_recordset(p_rows) as r(
      canvas_id bigint, title text, message text, author text, posted_at timestamptz, html_url text
    )
    on conflict (canvas_id) do update
      -- Synced columns only. Not listed on purpose: read, important.
      set title = excluded.title,
          message = excluded.message,
          author = excluded.author,
          posted_at = excluded.posted_at,
          html_url = excluded.html_url,
          synced_at = now()
      where n.owner_id = p_owner
        and (n.title, n.message, n.author, n.posted_at, n.html_url)
            is distinct from
            (excluded.title, excluded.message, excluded.author, excluded.posted_at, excluded.html_url)
    returning (xmax = 0) as was_inserted
  )
  select count(*) filter (where was_inserted), count(*) filter (where not was_inserted)
  into v_inserted, v_updated
  from upserted;

  return query select v_inserted, v_updated, jsonb_array_length(p_rows) - v_inserted - v_updated;
end;
$$;

-- Functions in the public schema can be called through the API by default. These write on behalf
-- of any owner they are given, so only the service role (the server-side sync) may run them.
revoke execute on function sync_assignment_groups(uuid, uuid, jsonb) from public, anon, authenticated;
revoke execute on function sync_assignments(uuid, uuid, jsonb) from public, anon, authenticated;
revoke execute on function sync_announcements(uuid, uuid, jsonb) from public, anon, authenticated;

grant execute on function sync_assignment_groups(uuid, uuid, jsonb) to service_role;
grant execute on function sync_assignments(uuid, uuid, jsonb) to service_role;
grant execute on function sync_announcements(uuid, uuid, jsonb) to service_role;
