-- Phase 3: personal to-dos, optionally tied to a course. Entirely yours; no sync writes here.

create table todos (
  id         uuid primary key default gen_random_uuid(),
  title      text not null check (length(btrim(title)) between 1 and 200),
  course_id  uuid references courses(id) on delete set null, -- a to-do outlives its course link
  due_on     date,                                          -- a day, not a time: to-dos are day-sized
  done_at    timestamptz,                                   -- null while open; "done" is derived from it
  created_at timestamptz not null default now(),
  owner_id   uuid not null default auth.uid()
);

-- The dashboard lists open to-dos by due date.
create index todos_open_due_on_idx on todos (due_on) where done_at is null;
create index todos_course_id_idx on todos (course_id);

alter table todos enable row level security;
create policy "owner only" on todos for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
