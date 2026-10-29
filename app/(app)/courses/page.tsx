import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, CircleAlert, Megaphone } from "lucide-react";
import { CourseCode } from "@/components/courses/course-code";
import { PAGE_CLASS, PageHeader } from "@/components/page-header";
import { StatusIcon } from "@/components/pathway/status-icon";
import { CoursesSkeleton } from "@/components/skeletons";
import { formatDueIn } from "@/lib/assignments/status";
import { coursePath } from "@/lib/courses/slug";
import { summarizeCourse, type CourseSummary } from "@/lib/courses/summary";
import { PATHWAY_COURSE_COLUMNS, summarizeTerms, type PathwayCourse, type TermSummary } from "@/lib/pathway/summarize";
import { loadSetup } from "@/lib/setup/load";
import { categoryClass } from "@/lib/setup/setup";
import { createClient } from "@/lib/supabase/server";
import { formatDay, formatTime } from "@/lib/timetable/format";
import { SESSION_TYPE_LABELS } from "@/lib/timetable/kind";
import { cn } from "@/lib/utils";

// This term's courses as cards (grade, next deadline, next class, unread), then every other
// course in the plan by term, so any course page is two clicks away. Finished terms (transfer
// credit is most of them) fold away under a disclosure.
export default function CoursesPage() {
  return (
    <main className={PAGE_CLASS}>
      <Suspense fallback={<CoursesSkeleton />}>
        <Courses />
      </Suspense>
    </main>
  );
}

async function Courses() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  // The proxy already redirects signed-out visitors; this is a second check in case it is ever bypassed.
  if (!claims?.claims) redirect("/login");

  const { data: terms, error: termsError } = await supabase
    .from("terms")
    .select(`id, name, kind, time_zone, courses(${PATHWAY_COURSE_COLUMNS})`)
    .order("id");
  if (termsError) throw new Error(`Loading terms failed: ${termsError.message}`);

  const summaries = summarizeTerms(terms);
  const current = summaries.find((term) => term.phase === "current");
  const timeZone = terms.find((term) => term.id === current?.id)?.time_zone ?? "UTC";
  const courses = current?.courses ?? [];
  const ids = courses.map((course) => course.id);
  const now = new Date();

  const [groupsResult, assignmentsResult, sessionsResult, unreadResult, setup] = await Promise.all([
    supabase.from("assignment_groups").select("course_id, canvas_id, name, weight").in("course_id", ids),
    supabase
      .from("assignments")
      .select("course_id, title, assignment_group_id, points_possible, score, due_at, workflow_state, submitted_at, progress")
      .in("course_id", ids)
      .eq("deleted_in_canvas", false),
    supabase
      .from("class_sessions")
      .select("course_id, kind, starts_at, cancelled")
      .in("course_id", ids)
      .gte("starts_at", now.toISOString())
      .order("starts_at")
      .limit(200),
    supabase.from("announcements").select("course_id").in("course_id", ids).eq("read", false).eq("deleted_in_canvas", false),
    loadSetup(),
  ]);
  for (const result of [groupsResult, assignmentsResult, sessionsResult, unreadResult]) {
    if (result.error) throw new Error(`Loading courses failed: ${result.error.message}`);
  }
  const data = {
    groups: groupsResult.data ?? [],
    assignments: assignmentsResult.data ?? [],
    sessions: sessionsResult.data ?? [],
    unread: unreadResult.data ?? [],
  };
  // Co-op placements are entries in the plan, not courses with a page, so they aren't listed.
  const listed = summaries
    .filter((term) => term.id !== current?.id)
    .map((term) => ({ ...term, courses: term.courses.filter((course) => !course.type.coop) }))
    .filter((term) => term.courses.length > 0);
  const upcoming = listed.filter((term) => term.phase !== "past");
  const finished = listed.filter((term) => term.phase === "past");

  return (
    <>
      <PageHeader eyebrow={current?.name} title="Courses" />

      {courses.length === 0 ? (
        <p className="text-muted-foreground">No current term yet. Mark a course as in progress on the pathway and it will show up here.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <li key={course.id}>
              <CourseCard course={course} summary={summarizeCourse(course.id, data, now, setup.profile.gradeScale)} now={now} timeZone={timeZone} />
            </li>
          ))}
        </ul>
      )}

      {upcoming.length > 0 && (
        <section aria-labelledby="later-terms" className="flex flex-col gap-3">
          <h2 id="later-terms" className="px-1 text-title-3">
            {current ? "Later terms" : "All courses"}
          </h2>
          <TermList terms={upcoming} />
        </section>
      )}

      {finished.length > 0 && (
        <details className="group flex flex-col gap-3">
          <summary className="flex w-max cursor-pointer list-none items-center gap-1.5 rounded-lg px-1 text-title-3 [&::-webkit-details-marker]:hidden">
            <ChevronRight aria-hidden className="size-5 text-muted-foreground transition-transform group-open:rotate-90" />
            Finished terms
            <span className="text-base font-normal text-muted-foreground tabular-nums">
              {finished.reduce((total, term) => total + term.courses.length, 0)} courses
            </span>
          </summary>
          <div className="mt-3">
            <TermList terms={finished} />
          </div>
        </details>
      )}
    </>
  );
}

/** Terms side by side, each a compact list of its courses linking to their pages. */
function TermList({ terms }: { terms: TermSummary[] }) {
  return (
    <div className="grid gap-x-6 gap-y-5 rounded-2xl bg-card p-5 shadow-card sm:grid-cols-2 lg:grid-cols-3">
      {terms.map((term) => (
        <div key={term.id} className="flex flex-col gap-1.5">
          <h3 className="text-sm font-semibold">{term.name}</h3>
          <ul className="flex flex-col">
            {term.courses.map((course) => (
              <li key={course.id}>
                <Link
                  href={coursePath(course.code)}
                  className="-mx-2 flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-fill-tertiary focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <StatusIcon status={course.status} className="size-3.5 shrink-0" />
                  <span className="w-24 shrink-0 font-medium whitespace-nowrap tabular-nums">{course.code}</span>
                  <span className="min-w-0 truncate text-muted-foreground">{course.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function CourseCard({ course, summary, now, timeZone }: { course: PathwayCourse; summary: CourseSummary; now: Date; timeZone: string }) {
  const { grade, nextDue, nextClass, overdue, unread } = summary;
  const when = (iso: string) => `${formatDay(new Date(iso), timeZone)} ${formatTime(new Date(iso), timeZone)}`;

  return (
    // The whole card is the link; the bar on the left is the course's type, as on the pathway.
    <Link
      href={coursePath(course.code)}
      className={cn(
        "press flex h-full gap-3 rounded-2xl bg-card p-4 shadow-card hover:shadow-raised focus-visible:outline-2 focus-visible:outline-ring",
        categoryClass(course.type.color),
      )}
    >
      <span aria-hidden className="w-1 shrink-0 rounded-full bg-(--course) contrast-more:w-1.5" />
      <span className="flex min-w-0 flex-1 flex-col gap-3">
        <span className="flex items-start justify-between gap-3">
          <span className="min-w-0">
            <CourseCode code={course.code} />
            <span className="mt-1.5 block text-headline">{course.title}</span>
            <span className="sr-only">, {course.type.name}</span>
          </span>
          {grade && (
            <span className="shrink-0 text-right">
              <span className="block text-title-3 tabular-nums">{grade.percent.toFixed(1)}%</span>
              <span className="text-sm text-muted-foreground">{grade.letter}</span>
            </span>
          )}
        </span>

        <span className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
          <span className="text-tertiary-foreground">Next due</span>
          <span className="truncate">
            {nextDue ? (
              <>
                {nextDue.title} <span className="text-muted-foreground">· {formatDueIn(nextDue.dueAt, now)}</span>
              </>
            ) : (
              <span className="text-muted-foreground">Nothing coming up</span>
            )}
          </span>
          <span className="text-tertiary-foreground">Next class</span>
          <span className="truncate">
            {nextClass ? (
              <>
                {when(nextClass.startsAt)} <span className="text-muted-foreground">· {SESSION_TYPE_LABELS[nextClass.kind]}</span>
              </>
            ) : (
              <span className="text-muted-foreground">None in the timetable</span>
            )}
          </span>
        </span>

        {(overdue > 0 || unread > 0) && (
          <span className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium">
            {overdue > 0 && (
              <span className="flex items-center gap-1 text-status-overdue">
                <CircleAlert aria-hidden className="size-3.5" />
                {overdue} overdue
              </span>
            )}
            {unread > 0 && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Megaphone aria-hidden className="size-3.5" />
                {unread} unread
              </span>
            )}
          </span>
        )}
      </span>
    </Link>
  );
}
