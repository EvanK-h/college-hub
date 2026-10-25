-- Progress per requirement, computed from the linked courses' statuses and never stored.
-- Percentages count courses, not SH, because some courses are worth 0 SH.

-- security_invoker makes the view run as the caller, so the owner-only RLS policies on the
-- underlying tables still apply. Without it a view runs as its owner and bypasses RLS.
create view requirement_progress with (security_invoker = true) as
select
  r.id as requirement_id,
  r.name,
  r.area,
  count(c.id) as total_courses,
  count(c.id) filter (where c.status = 'done') as done_courses,
  count(c.id) filter (where c.status in ('done', 'in_progress')) as started_courses,
  coalesce(sum(c.credits), 0) as total_sh,
  coalesce(sum(c.credits) filter (where c.status = 'done'), 0) as done_sh,
  -- nullif turns a zero count into null so the division cannot fail; coalesce then reports 0.
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
group by r.id, r.name, r.area;
