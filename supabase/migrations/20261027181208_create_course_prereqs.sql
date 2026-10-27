-- Phase 4: prerequisites and corequisites from the course catalogue, for checking plan moves.
--
-- A course's requirements are an AND of OR-groups: rows with the same (course, kind, option_group)
-- are alternatives, and every group must be met. "CS 2100 or CS 2500, and CS 1800" is two groups:
--
--   CS 3000 | CS 2100 | prereq | 1
--   CS 3000 | CS 2500 | prereq | 1
--   CS 3000 | CS 1800 | prereq | 2
--
-- The required course is a code, not a foreign key: an alternative is often a course that isn't
-- in the plan (one you placed out of, or the other branch of an "or"), and it still has to be
-- written down. A prerequisite must be finished in an earlier term; a corequisite may be taken in
-- the same term.

create type prereq_kind as enum ('prereq','coreq');

create table course_prereqs (
  id            uuid primary key default gen_random_uuid(),
  course_id     uuid not null references courses(id) on delete cascade,
  requires_code text not null check (requires_code ~ '^[A-Z]{2,4} [0-9]{4}$'),
  kind          prereq_kind not null default 'prereq',
  option_group  smallint not null default 1 check (option_group >= 1),
  owner_id      uuid not null default auth.uid(),
  unique (owner_id, course_id, kind, option_group, requires_code)
);

create index course_prereqs_course_id_idx on course_prereqs (course_id);

alter table course_prereqs enable row level security;
create policy "owner only" on course_prereqs for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
