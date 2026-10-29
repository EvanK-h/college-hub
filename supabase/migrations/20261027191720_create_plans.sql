-- Phase 4: what-if plans. A plan is a saved arrangement of the planned courses, changed freely
-- without touching the real plan until it is made active.
--
-- Each plan_courses row either places an existing course in a term, or takes in a swap option
-- in place of one course. Only planned courses belong in a plan: done and in-progress courses
-- always stay where they are. A planned course with no row (one added after the plan was saved)
-- counts as being in its real term, so old plans never lose courses.

create table plans (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(btrim(name)) between 1 and 60),
  created_at timestamptz not null default now(),
  owner_id   uuid not null default auth.uid(),
  unique (owner_id, name)
);

alter table plans enable row level security;
create policy "owner only" on plans for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create table plan_courses (
  id                 uuid primary key default gen_random_uuid(),
  plan_id            uuid not null references plans(id) on delete cascade,
  term_id            smallint not null references terms(id),
  course_id          uuid references courses(id) on delete cascade,      -- an existing course
  swap_option_id     uuid references swap_options(id) on delete cascade, -- or a swap taken in
  replaces_course_id uuid references courses(id) on delete cascade,      -- ...in place of this course
  owner_id           uuid not null default auth.uid(),
  check (
    (course_id is not null and swap_option_id is null and replaces_course_id is null)
    or (course_id is null and swap_option_id is not null and replaces_course_id is not null)
  ),
  unique (plan_id, course_id),
  unique (plan_id, swap_option_id),
  unique (plan_id, replaces_course_id)
);

create index plan_courses_plan_id_idx on plan_courses (plan_id);

alter table plan_courses enable row level security;
create policy "owner only" on plan_courses for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Saves a new plan as a copy of the real plan's planned courses, or of another plan. One
-- transaction, so a failed copy leaves no half-made plan. Runs as the caller, so RLS applies.
create function create_plan(p_name text, p_from uuid default null)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_plan uuid;
begin
  insert into public.plans (name) values (btrim(p_name)) returning id into v_plan;

  if p_from is null then
    insert into public.plan_courses (plan_id, course_id, term_id)
    select v_plan, c.id, c.term_id from public.courses c where c.status = 'planned';
  else
    if not exists (select 1 from public.plans where id = p_from) then
      raise exception 'plan % not found', p_from using errcode = 'P0002';
    end if;
    insert into public.plan_courses (plan_id, course_id, swap_option_id, replaces_course_id, term_id)
    select v_plan, course_id, swap_option_id, replaces_course_id, term_id
    from public.plan_courses where plan_id = p_from;
  end if;

  return v_plan;
end;
$$;

-- Makes a plan the real plan, in one transaction:
-- 1. Planned courses move to the plan's terms.
-- 2. Each swap rewrites the course it replaces in place (code, title, term), so the slot keeps
--    its requirement links. The old course's NUpath attributes, notes and catalogue
--    prerequisites described a different course, so they are cleared, and the swap option no
--    longer lists the course as one it replaces.
-- 3. The plan's swap rows become ordinary course rows, so the plan matches the real plan after.
-- Swap names must read "CODE 1234 · Title"; anything else stops the whole change.
create function apply_plan(p_plan uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_swap record;
  v_code text;
begin
  if not exists (select 1 from public.plans where id = p_plan) then
    raise exception 'plan % not found', p_plan using errcode = 'P0002';
  end if;

  update public.courses c
  set term_id = pc.term_id
  from public.plan_courses pc
  where pc.plan_id = p_plan
    and pc.course_id = c.id
    and c.status = 'planned'
    and c.term_id <> pc.term_id
    and not exists (select 1 from public.plan_courses s where s.plan_id = p_plan and s.replaces_course_id = c.id);

  for v_swap in
    select pc.id, pc.term_id, pc.swap_option_id, pc.replaces_course_id, so.swap_in
    from public.plan_courses pc
    join public.swap_options so on so.id = pc.swap_option_id
    where pc.plan_id = p_plan
  loop
    v_code := substring(v_swap.swap_in from '^([A-Z]{2,4} [0-9]{4}) · ');
    if v_code is null then
      raise exception 'swap "%" has no single course code', v_swap.swap_in using errcode = '22023';
    end if;

    update public.courses
    set code = v_code,
        title = substring(v_swap.swap_in from ' · (.+)$'),
        term_id = v_swap.term_id,
        nupath = '{}',
        notes = null
    where id = v_swap.replaces_course_id and status = 'planned';
    if not found then
      raise exception 'the course swap "%" replaces is no longer planned', v_swap.swap_in using errcode = '22023';
    end if;

    delete from public.course_prereqs where course_id = v_swap.replaces_course_id;
    delete from public.swap_replaces
    where swap_option_id = v_swap.swap_option_id and course_id = v_swap.replaces_course_id;

    delete from public.plan_courses where plan_id = p_plan and course_id = v_swap.replaces_course_id;
    update public.plan_courses
    set course_id = v_swap.replaces_course_id, swap_option_id = null, replaces_course_id = null
    where id = v_swap.id;
  end loop;
end;
$$;

revoke execute on function create_plan(text, uuid) from public, anon;
revoke execute on function apply_plan(uuid) from public, anon;
grant execute on function create_plan(text, uuid) to authenticated;
grant execute on function apply_plan(uuid) to authenticated;
