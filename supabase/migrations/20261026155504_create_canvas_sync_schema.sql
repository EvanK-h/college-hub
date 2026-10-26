-- Phase 2: the tables the Canvas sync writes to, plus the sync history.
-- Columns are either synced (the sync owns them) or yours (the sync never touches them);
-- the comments mark which is which.

create type sync_source as enum ('canvas','timetable');
create type sync_status as enum ('running','success','error','token_expired');
create type assignment_kind as enum ('assignment','quiz','exam','discussion','lab','reading');
create type assignment_progress as enum ('not_started','in_progress');
create type assignment_priority as enum ('low','medium','high');

-- One row per sync run. error_message holds a short reason, never headers or tokens.
create table sync_runs (
  id            uuid primary key default gen_random_uuid(),
  source        sync_source not null,
  status        sync_status not null default 'running',
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  inserted      integer not null default 0,
  updated       integer not null default 0,
  unchanged     integer not null default 0,
  error_message text,
  owner_id      uuid not null default auth.uid()
);

-- Canvas's grading categories and their weights, needed later for the grade calculator.
create table assignment_groups (
  id        uuid primary key default gen_random_uuid(),
  canvas_id bigint not null unique,
  course_id uuid not null references courses(id) on delete cascade,
  name      text not null,
  weight    numeric,                           -- percent of the course grade; null/0 if the course is unweighted
  position  integer,
  synced_at timestamptz not null default now(),
  owner_id  uuid not null default auth.uid()
);

create table assignments (
  id                  uuid primary key default gen_random_uuid(),
  canvas_id           bigint not null unique,
  course_id           uuid not null references courses(id) on delete cascade,
  assignment_group_id bigint,                  -- Canvas's group ID, joined to assignment_groups.canvas_id
  title               text not null,
  kind                assignment_kind not null, -- guessed on first insert, then yours to correct
  due_at              timestamptz,
  points_possible     numeric,
  html_url            text not null,
  -- synced
  workflow_state      text,                    -- Canvas's own value: unsubmitted | submitted | graded | pending_review
  score               numeric,
  submitted_at        timestamptz,
  deleted_in_canvas   boolean not null default false,
  synced_at           timestamptz not null default now(),
  -- yours: the sync never writes these
  progress            assignment_progress not null default 'not_started',
  priority            assignment_priority,
  est_hours           numeric,
  notes               text,
  owner_id            uuid not null default auth.uid()
);

create table announcements (
  id                uuid primary key default gen_random_uuid(),
  canvas_id         bigint not null unique,
  course_id         uuid not null references courses(id) on delete cascade,
  title             text not null,
  message           text,                      -- HTML from Canvas
  author            text,
  posted_at         timestamptz,
  html_url          text not null,
  -- synced
  deleted_in_canvas boolean not null default false,
  synced_at         timestamptz not null default now(),
  -- yours: the sync never writes these
  read              boolean not null default false,
  important         boolean not null default false,
  owner_id          uuid not null default auth.uid()
);

-- Foreign keys are not indexed automatically; these cover the lookups the pages will make.
create index sync_runs_started_at_idx on sync_runs (started_at desc);
create index assignment_groups_course_id_idx on assignment_groups (course_id);
create index assignments_course_id_idx on assignments (course_id);
create index assignments_due_at_idx on assignments (due_at);
create index announcements_course_id_idx on announcements (course_id);
create index announcements_posted_at_idx on announcements (posted_at desc);

-- Row-level security, same pattern as the pathway tables.
alter table sync_runs enable row level security;
create policy "owner only" on sync_runs for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

alter table assignment_groups enable row level security;
create policy "owner only" on assignment_groups for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

alter table assignments enable row level security;
create policy "owner only" on assignments for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

alter table announcements enable row level security;
create policy "owner only" on announcements for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
