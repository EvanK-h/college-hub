-- Any school or major: the categories that were Northeastern-specific enums become per-owner data,
-- and the school's rules move from TypeScript into a profile. See the 2026-10-29 decision.
--
--   course_type enum           -> course_types        (name, palette colour, may sit in a co-op term)
--   req_area enum              -> requirement_areas   (name, position, headline or not)
--   swap_slot enum             -> swap_slots
--   courses.nupath (nupath[])  -> attributes + course_attributes (NUpath is one set of attributes)
--   swap quantum/ai relevance  -> focuses + swap_relevance (one rating per swap per focus)
--   grade scale, credit limits -> profiles (one row per owner)
--
-- Existing rows are converted in place, per owner, with the labels the app used to show, so
-- requirement links, plans and notes all survive. Statuses, term kinds, session types and the
-- relevance scale stay enums: they are the same at every school.

-- 1. The new tables. Each has owner_id, RLS and an owner-only policy, like every other table.

create table profiles (
  owner_id           uuid primary key default auth.uid(),
  school             text,
  preset             text check (preset in ('northeastern')),
  credit_unit        text not null default 'credits' check (char_length(credit_unit) between 1 and 12),
  -- The name shown for the attribute ring ("NUpath"); null hides it.
  attribute_set_name text,
  -- Lowest percentage for each letter, best first: [[93, "A"], [90, "A−"], ...].
  grade_scale        jsonb not null default '[[93,"A"],[90,"A−"],[87,"B+"],[83,"B"],[80,"B−"],[77,"C+"],[73,"C"],[70,"C−"],[67,"D+"],[63,"D"],[60,"D−"]]',
  -- Most credits a term of each kind may hold, e.g. {"semester": 18, "summer": 9}; a missing kind has no limit.
  credit_limits      jsonb not null default '{}'
);

create table course_types (
  id       uuid primary key default gen_random_uuid(),
  name     text not null check (char_length(btrim(name)) between 1 and 40),
  -- An index into the vetted category palette in globals.css (--category-1 ... --category-6).
  color    smallint not null check (color between 1 and 6),
  position smallint not null default 0,
  -- Courses of this type may sit in a co-op term without a warning (the co-op itself).
  coop     boolean not null default false,
  owner_id uuid not null default auth.uid(),
  unique (owner_id, name)
);

create table requirement_areas (
  id       uuid primary key default gen_random_uuid(),
  name     text not null check (char_length(btrim(name)) between 1 and 60),
  position smallint not null default 0,
  -- Headline areas get the top of the Requirements page.
  headline boolean not null default false,
  owner_id uuid not null default auth.uid(),
  unique (owner_id, name)
);

create table swap_slots (
  id       uuid primary key default gen_random_uuid(),
  name     text not null check (char_length(btrim(name)) between 1 and 60),
  position smallint not null default 0,
  owner_id uuid not null default auth.uid(),
  unique (owner_id, name)
);

-- Course attributes a degree requires a set of, such as Northeastern's NUpath codes.
create table attributes (
  id       uuid primary key default gen_random_uuid(),
  code     text not null check (char_length(btrim(code)) between 1 and 12),
  name     text not null,
  required boolean not null default true,
  position smallint not null default 0,
  owner_id uuid not null default auth.uid(),
  unique (owner_id, code)
);

create table course_attributes (
  course_id    uuid not null references courses(id) on delete cascade,
  attribute_id uuid not null references attributes(id) on delete cascade,
  owner_id     uuid not null default auth.uid(),
  primary key (course_id, attribute_id)
);

-- Directions the plan is read for (e.g. Quantum, AI). goal_code is the course the direction
-- builds towards, if there is one.
create table focuses (
  id        uuid primary key default gen_random_uuid(),
  name      text not null check (char_length(btrim(name)) between 1 and 30),
  goal_code text check (goal_code ~ '^[A-Z]{2,4} [0-9]{4}$'),
  position  smallint not null default 0,
  owner_id  uuid not null default auth.uid(),
  unique (owner_id, name)
);

create table swap_relevance (
  swap_option_id uuid not null references swap_options(id) on delete cascade,
  focus_id       uuid not null references focuses(id) on delete cascade,
  relevance      relevance not null,
  owner_id       uuid not null default auth.uid(),
  primary key (swap_option_id, focus_id)
);

create index course_attributes_attribute_id_idx on course_attributes (attribute_id);
create index swap_relevance_focus_id_idx on swap_relevance (focus_id);

do $$
declare
  t text;
begin
  foreach t in array array['profiles','course_types','requirement_areas','swap_slots','attributes','course_attributes','focuses','swap_relevance'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "owner only" on %I for all using (owner_id = auth.uid()) with check (owner_id = auth.uid())', t);
  end loop;
end;
$$;

-- 2. Convert existing data, per owner, using the labels the app showed for each enum value.

create temporary table owners_to_convert as
  select owner_id from courses
  union select owner_id from requirements
  union select owner_id from swap_options;

-- Everyone who had data was planning a Northeastern degree.
insert into profiles (owner_id, school, preset, credit_unit, attribute_set_name, credit_limits)
select owner_id, 'Northeastern University', 'northeastern', 'SH', 'NUpath', '{"semester": 18, "summer": 9}'
from owners_to_convert;

create temporary table type_map (key text, name text, color smallint, position smallint, coop boolean);
insert into type_map values
  ('cs_core', 'CS core', 1, 1, false),
  ('ai_concentration', 'AI concentration', 2, 2, false),
  ('physics_minor', 'Physics minor', 3, 3, false),
  ('major_support', 'Major support', 4, 4, false),
  ('general_elective', 'General elective', 5, 5, false),
  ('coop_program', 'Co-op / program', 6, 6, true);

insert into course_types (name, color, position, coop, owner_id)
select m.name, m.color, m.position, m.coop, o.owner_id from type_map m cross join owners_to_convert o;

alter table courses add column course_type_id uuid references course_types(id) on delete restrict;
update courses c
set course_type_id = ct.id
from type_map m join course_types ct on ct.name = m.name
where m.key = c.type::text and ct.owner_id = c.owner_id;
alter table courses alter column course_type_id set not null;
create index courses_course_type_id_idx on courses (course_type_id);

create temporary table area_map (key text, name text, position smallint, headline boolean);
insert into area_map values
  ('cs_required', 'CS required', 1, true),
  ('ai_concentration', 'AI concentration', 2, true),
  ('physics_minor', 'Physics minor', 3, true),
  ('cs_overview', 'CS overview', 4, false),
  ('cs_fundamentals', 'CS fundamentals', 5, false),
  ('security_presentation', 'Security and presentation', 6, false),
  ('khoury_electives', 'Khoury electives', 7, false),
  ('supporting', 'Supporting courses', 8, false),
  ('writing', 'Writing', 9, false),
  ('universitywide', 'Universitywide', 10, false);

insert into requirement_areas (name, position, headline, owner_id)
select m.name, m.position, m.headline, o.owner_id from area_map m cross join owners_to_convert o;

alter table requirements add column area_id uuid references requirement_areas(id) on delete restrict;
update requirements r
set area_id = ra.id
from area_map m join requirement_areas ra on ra.name = m.name
where m.key = r.area::text and ra.owner_id = r.owner_id;
alter table requirements alter column area_id set not null;
create index requirements_area_id_idx on requirements (area_id);

create temporary table slot_map (key text, name text, position smallint);
insert into slot_map values
  ('london_elective', 'London elective', 1),
  ('khoury_elective', 'Khoury elective', 2),
  ('ai_elective', 'AI elective', 3),
  ('software_engineering', 'Software engineering', 4),
  ('placement_substitute', 'Placement substitute', 5),
  ('physics_minor_elective', 'Physics minor elective', 6),
  ('advanced_writing', 'Advanced writing', 7);

insert into swap_slots (name, position, owner_id)
select m.name, m.position, o.owner_id from slot_map m cross join owners_to_convert o;

alter table swap_options add column slot_id uuid references swap_slots(id) on delete restrict;
update swap_options s
set slot_id = ss.id
from slot_map m join swap_slots ss on ss.name = m.name
where m.key = s.slot::text and ss.owner_id = s.owner_id;
alter table swap_options alter column slot_id set not null;
create index swap_options_slot_id_idx on swap_options (slot_id);

-- NUpath codes become attributes, in the order the Requirements page showed them.
insert into attributes (code, name, position, owner_id)
select a.code, a.name, a.position, o.owner_id
from (values
  ('ND', 'Engaging with the Natural and Designed World', 1),
  ('EI', 'Exploring Creative Expression and Innovation', 2),
  ('IC', 'Interpreting Culture', 3),
  ('FQ', 'Conducting Formal and Quantitative Reasoning', 4),
  ('SI', 'Understanding Societies and Institutions', 5),
  ('AD', 'Analyzing and Using Data', 6),
  ('DD', 'Engaging Differences and Diversity', 7),
  ('ER', 'Employing Ethical Reasoning', 8),
  ('WF', 'Writing in the First Year', 9),
  ('WD', 'Advanced Writing in the Disciplines', 10),
  ('WI', 'Writing-Intensive', 11),
  ('EX', 'Integrating Knowledge and Skills Through Experience', 12),
  ('CE', 'Demonstrating Thought and Action in a Capstone', 13)
) as a(code, name, position)
cross join owners_to_convert o;

insert into course_attributes (course_id, attribute_id, owner_id)
select c.id, a.id, c.owner_id
from courses c
cross join lateral unnest(c.nupath) as n(code)
join attributes a on a.owner_id = c.owner_id and a.code = n.code::text;

-- Quantum and AI become focuses, with the old columns as their ratings.
insert into focuses (name, goal_code, position, owner_id)
select f.name, f.goal_code, f.position, o.owner_id
from (values ('Quantum', 'PHYS 5352', 1), ('AI', null, 2)) as f(name, goal_code, position)
cross join (select distinct owner_id from swap_options) o;

insert into swap_relevance (swap_option_id, focus_id, relevance, owner_id)
select s.id, f.id, case f.name when 'Quantum' then s.quantum_relevance else s.ai_relevance end, s.owner_id
from swap_options s
join focuses f on f.owner_id = s.owner_id;

-- 3. Drop the old columns and types. The progress view reads requirements.area, so it is
-- rebuilt on area_id.

drop view requirement_progress;

alter table swap_options drop constraint swap_options_owner_id_swap_in_slot_key;
alter table swap_options add constraint swap_options_owner_id_swap_in_slot_id_key unique (owner_id, swap_in, slot_id);

alter table courses drop column type, drop column nupath;
alter table requirements drop column area;
alter table swap_options drop column slot, drop column quantum_relevance, drop column ai_relevance;
drop type course_type;
drop type req_area;
drop type swap_slot;
drop type nupath;

-- Progress per requirement, computed from the linked courses' statuses and never stored.
-- security_invoker keeps the owner-only RLS policies in force (see the original view).
create view requirement_progress with (security_invoker = true) as
select
  r.id as requirement_id,
  r.name,
  r.area_id,
  count(c.id) as total_courses,
  count(c.id) filter (where c.status = 'done') as done_courses,
  count(c.id) filter (where c.status in ('done', 'in_progress')) as started_courses,
  coalesce(sum(c.credits), 0) as total_sh,
  coalesce(sum(c.credits) filter (where c.status = 'done'), 0) as done_sh,
  coalesce(round(100.0 * count(c.id) filter (where c.status = 'done') / nullif(count(c.id), 0)), 0) as done_pct,
  coalesce(round(100.0 * count(c.id) filter (where c.status in ('done', 'in_progress')) / nullif(count(c.id), 0)), 0) as started_pct,
  case
    when count(c.id) > 0 and count(c.id) filter (where c.status = 'done') = count(c.id) then 'done'
    when count(c.id) filter (where c.status in ('done', 'in_progress')) > 0 then 'in_progress'
    else 'planned'
  end as status
from requirements r
left join course_requirements cr on cr.requirement_id = r.id
left join courses c on c.id = cr.course_id
group by r.id, r.name, r.area_id;

-- 4. apply_plan cleared courses.nupath for a swapped-in course; attributes now live in their own
-- table. Otherwise unchanged (see the create_plans migration).
create or replace function apply_plan(p_plan uuid)
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
        notes = null
    where id = v_swap.replaces_course_id and status = 'planned';
    if not found then
      raise exception 'the course swap "%" replaces is no longer planned', v_swap.swap_in using errcode = '22023';
    end if;

    delete from public.course_attributes where course_id = v_swap.replaces_course_id;
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

drop table owners_to_convert, type_map, area_map, slot_map;
