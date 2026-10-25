-- Phase 1: the degree-pathway tables.
-- Every table is owned (owner_id) and protected by row-level security in this same file.

-- Closed sets are enums, so a typo fails at the database.
create type course_type as enum ('cs_core','ai_concentration','physics_minor','major_support','general_elective','coop_program');
create type course_status as enum ('planned','in_progress','done');
create type nupath as enum ('ND','EI','IC','FQ','SI','AD','DD','ER','WF','WD','WI','EX','CE');
create type req_area as enum ('cs_overview','cs_fundamentals','cs_required','security_presentation','khoury_electives','supporting','writing','ai_concentration','physics_minor','universitywide');
create type term_kind as enum ('transfer','semester','summer','coop');
create type swap_slot as enum ('london_elective','khoury_elective','ai_elective','software_engineering','placement_substitute','physics_minor_elective','advanced_writing');
-- Declared worst to best: Postgres sorts enums by declaration order, so "order by quantum_relevance desc" ranks High first.
create type quantum_relevance as enum ('none','lower','low','medium','high');

create table terms (
  id        smallint primary key,            -- sort order: 0 = transfer credit
  name      text not null unique,            -- 'Fall 2026 · London'
  kind      term_kind not null,
  campus    text,                            -- 'london' | 'boston' | null
  starts_on date,
  ends_on   date,
  time_zone text not null default 'America/New_York',
  owner_id  uuid not null default auth.uid()
);

create table courses (
  id               uuid primary key default gen_random_uuid(),
  code             text not null,            -- 'CS 2100'
  title            text not null,
  credits          numeric(3,1) not null,    -- SH
  type             course_type not null,
  term_id          smallint not null references terms(id),
  status           course_status not null default 'planned',
  nupath           nupath[] not null default '{}',
  notes            text,
  canvas_course_id bigint unique,
  owner_id         uuid not null default auth.uid(),
  unique (owner_id, code)
);

create table requirements (
  id       uuid primary key default gen_random_uuid(),
  name     text not null,
  area     req_area not null,
  options  text,                             -- 'CS 3100 + CS 3101'
  notes    text,
  owner_id uuid not null default auth.uid()
);

create table course_requirements (
  course_id      uuid not null references courses(id) on delete cascade,
  requirement_id uuid not null references requirements(id) on delete cascade,
  owner_id       uuid not null default auth.uid(),
  primary key (course_id, requirement_id)
);

-- The same course can be offered as a swap for different slots (e.g. CS 4810), so uniqueness is per slot.
create table swap_options (
  id                 uuid primary key default gen_random_uuid(),
  swap_in            text not null,          -- 'CS 4810 · Advanced Algorithms'
  slot               swap_slot not null,
  fits_in            text,                   -- free text: 'Any of the three slots'
  prerequisites      text,
  quantum_relevance  quantum_relevance not null,
  why_consider       text,
  why_current_better text,
  owner_id           uuid not null default auth.uid(),
  unique (owner_id, swap_in, slot)
);

create table swap_replaces (
  swap_option_id uuid not null references swap_options(id) on delete cascade,
  course_id      uuid not null references courses(id) on delete cascade,
  owner_id       uuid not null default auth.uid(),
  primary key (swap_option_id, course_id)
);

-- Foreign keys are not indexed automatically; these cover the lookups the pages will make.
create index courses_term_id_idx on courses (term_id);
create index course_requirements_requirement_id_idx on course_requirements (requirement_id);
create index swap_replaces_course_id_idx on swap_replaces (course_id);

-- Row-level security: with RLS on and no matching policy a table returns nothing,
-- so each table gets one policy that lets a signed-in user touch only their own rows.
alter table terms enable row level security;
create policy "owner only" on terms for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

alter table courses enable row level security;
create policy "owner only" on courses for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

alter table requirements enable row level security;
create policy "owner only" on requirements for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

alter table course_requirements enable row level security;
create policy "owner only" on course_requirements for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

alter table swap_options enable row level security;
create policy "owner only" on swap_options for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

alter table swap_replaces enable row level security;
create policy "owner only" on swap_replaces for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
