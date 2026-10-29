import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { StatusPill } from "@/components/assignments/status-pill";
import { PAGE_CLASS, PageHeader } from "@/components/page-header";
import { WeekGrid, type GridSession } from "@/components/calendar/week-grid";
import { CalendarSkeleton } from "@/components/skeletons";
import { TODAY_MARKER_CLASS } from "@/components/today-marker";
import { buttonVariants } from "@/components/ui/button";
import { assignmentStatus } from "@/lib/assignments/status";
import { neighbours, parseCalendarParams, viewRange, type CalendarView } from "@/lib/calendar/params";
import { coursePath } from "@/lib/courses/slug";
import { addDays, daysBetween, monthGrid, weekAgenda } from "@/lib/dashboard/agenda";
import { PATHWAY_COURSE_COLUMNS, summarizeTerms } from "@/lib/pathway/summarize";
import { createClient } from "@/lib/supabase/server";
import { dayKey, formatTime, shortLocation } from "@/lib/timetable/format";
import { SESSION_TYPE_LABELS, sessionLabel } from "@/lib/timetable/kind";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// The view and date come from the URL, so they are runtime data inside a Suspense boundary.
export default function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  return (
    <main className={PAGE_CLASS}>
      <Suspense fallback={<CalendarSkeleton />}>
        {searchParams.then((params) => (
          <Calendar searchParams={params} />
        ))}
      </Suspense>
    </main>
  );
}

async function Calendar({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  // The proxy already redirects signed-out visitors; this is a second check in case it is ever bypassed.
  if (!claims?.claims) redirect("/login");

  const { data: terms, error: termsError } = await supabase
    .from("terms")
    .select(`id, name, kind, time_zone, courses(${PATHWAY_COURSE_COLUMNS})`)
    .order("id");
  if (termsError) throw new Error(`Loading terms failed: ${termsError.message}`);
  const currentTerm = summarizeTerms(terms).find((term) => term.phase === "current");
  const timeZone = terms.find((term) => term.id === currentTerm?.id)?.time_zone ?? "UTC";

  const now = new Date();
  const today = dayKey(now, timeZone);
  const { view, date } = parseCalendarParams(searchParams, today);
  const { first, last } = viewRange(view, date);

  // A day's slack each side, since days are cut in the term's zone, not UTC.
  const from = `${addDays(first, -1)}T00:00:00Z`;
  const to = `${addDays(last, 2)}T00:00:00Z`;
  const [sessionsResult, assignmentsResult] = await Promise.all([
    supabase
      .from("class_sessions")
      .select("id, kind, title, starts_at, ends_at, location, cancelled, courses(code, type:course_types(color))")
      .gte("starts_at", from)
      .lt("starts_at", to)
      .order("starts_at"),
    supabase
      .from("assignments")
      .select("id, title, kind, due_at, html_url, workflow_state, score, submitted_at, progress, courses(code)")
      .eq("deleted_in_canvas", false)
      .gte("due_at", from)
      .lt("due_at", to)
      .order("due_at"),
  ]);
  if (sessionsResult.error) throw new Error(`Loading classes failed: ${sessionsResult.error.message}`);
  if (assignmentsResult.error) throw new Error(`Loading assignments failed: ${assignmentsResult.error.message}`);

  const days = weekAgenda(sessionsResult.data, assignmentsResult.data, first, timeZone, daysBetween(first, last) + 1);
  const byDay = new Map(days.map((day) => [day.day, day]));
  const { previous, next } = neighbours(view, date);
  const href = (target: { view?: CalendarView; date?: string }) =>
    `/calendar?view=${target.view ?? view}&date=${target.date ?? date}`;

  return (
    <>
      <PageHeader title={formatRangeTitle(view, first, last)}>
        <nav aria-label="Calendar" className="mt-2 flex flex-wrap items-center gap-2">
          <Link href={href({ date: previous })} className={buttonVariants({ variant: "outline", size: "icon-sm" })}>
            <ChevronLeft aria-hidden />
            <span className="sr-only">Previous {view}</span>
          </Link>
          <Link href={href({ date: today })} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Today
          </Link>
          <Link href={href({ date: next })} className={buttonVariants({ variant: "outline", size: "icon-sm" })}>
            <ChevronRight aria-hidden />
            <span className="sr-only">Next {view}</span>
          </Link>
          <span className="ml-2 inline-flex rounded-full bg-fill-secondary p-1">
            {(["month", "week"] as const).map((option) => (
              <Link
                key={option}
                href={href({ view: option })}
                aria-current={option === view ? "page" : undefined}
                className={cn(
                  "press rounded-full px-3 py-1 text-sm font-medium capitalize",
                  option === view ? "bg-card text-foreground shadow-card" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option}
              </Link>
            ))}
          </span>
        </nav>
      </PageHeader>

      {view === "month" ? (
        <MonthView first={first} byDay={byDay} today={today} href={href} />
      ) : (
        <>
          {/* A time grid from tablet width up; on a phone, the days as a list. */}
          <div className="hidden md:block">
            <WeekGrid days={days} today={today} timeZone={timeZone} now={now} />
          </div>
          <div className="md:hidden">
            <WeekView days={days} today={today} timeZone={timeZone} now={now} />
          </div>
        </>
      )}
    </>
  );
}

type Day = ReturnType<typeof weekAgenda<CalendarSession, CalendarAssignment>>[number];
type CalendarSession = GridSession;
type CalendarAssignment = {
  id: string;
  title: string;
  kind: string;
  due_at: string | null;
  html_url: string;
  workflow_state: string | null;
  score: number | null;
  submitted_at: string | null;
  progress: "not_started" | "in_progress";
  courses: { code: string } | null;
};

function MonthView({
  first,
  byDay,
  today,
  href,
}: {
  first: string;
  byDay: ReadonlyMap<string, Day>;
  today: string;
  href: (target: { view?: CalendarView; date?: string }) => string;
}) {
  const [year, month] = first.split("-").map(Number) as [number, number];
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-2xl table-fixed border-separate border-spacing-1 text-xs">
        <thead>
          <tr>
            {WEEKDAYS.map((day) => (
              <th key={day} scope="col" className="pb-1 text-left font-medium text-tertiary-foreground">
                {day.slice(0, 3)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {monthGrid(year, month).map((week) => (
            <tr key={week.find(Boolean)}>
              {week.map((day, index) => {
                if (!day) return <td key={`pad-${index}`} />;
                const entry = byDay.get(day);
                const live = entry?.sessions.filter((s) => !s.cancelled) ?? [];
                // Classes of your courses are counted, not listed: there are several most weekdays.
                const classes = live.filter((s) => s.courses && s.kind !== "exam").length;
                const exams = live.filter((s) => s.kind === "exam");
                const otherEvents = live.filter((s) => !s.courses && s.kind !== "exam");
                return (
                  // Days behind you sit flat on the page; today and the days ahead are cards. The whole
                  // cell opens that week: the link's ::after covers it, and the cell shows its focus.
                  <td
                    key={day}
                    className={cn(
                      "relative h-28 rounded-xl p-2 align-top transition-shadow has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring",
                      day < today
                        ? "text-muted-foreground ring-1 ring-separator ring-inset hover:bg-fill-tertiary"
                        : "bg-card shadow-card hover:shadow-raised",
                    )}
                  >
                    <Link
                      href={href({ view: "week", date: day })}
                      aria-current={day === today ? "date" : undefined}
                      className={cn(
                        "inline-flex size-6 items-center justify-center rounded-full text-sm tabular-nums after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none",
                        day < today && "text-tertiary-foreground",
                        day === today && TODAY_MARKER_CLASS,
                      )}
                    >
                      {Number(day.slice(8))}
                    </Link>
                    <ul className="mt-1 flex flex-col gap-0.5">
                      {exams.map((exam) => (
                        <li key={exam.id} className="truncate font-semibold">
                          {sessionLabel(exam)}
                        </li>
                      ))}
                      {otherEvents.map((event) => (
                        <li key={event.id} className="truncate">
                          {event.title}
                        </li>
                      ))}
                      {entry?.due.map((assignment) => (
                        <li key={assignment.id} className="truncate">
                          <span className="text-tertiary-foreground">{assignment.courses?.code} </span>
                          {assignment.title}
                        </li>
                      ))}
                      {classes > 0 && (
                        <li className="text-tertiary-foreground">
                          {classes} class{classes > 1 ? "es" : ""}
                        </li>
                      )}
                    </ul>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WeekView({ days, today, timeZone, now }: { days: Day[]; today: string; timeZone: string; now: Date }) {
  return (
    <ol className="flex flex-col gap-3">
      {days.map((day, index) => (
        <li
          key={day.day}
          aria-current={day.day === today ? "date" : undefined}
          className="flex flex-col gap-2 rounded-2xl bg-card p-3 shadow-card"
        >
          <h2 className="flex items-center gap-1 text-sm font-semibold">
            {WEEKDAYS[index]?.slice(0, 3)}
            <span className={cn("inline-flex size-6 items-center justify-center rounded-full tabular-nums", day.day === today && TODAY_MARKER_CLASS)}>
              {Number(day.day.slice(8))}
            </span>
          </h2>
          {day.sessions.length === 0 && day.due.length === 0 && <p className="text-xs text-tertiary-foreground">Free</p>}
          <ul className="flex flex-col gap-2 text-xs">
            {day.sessions.map((session) => (
              <li key={session.id} className={cn(session.cancelled && "text-muted-foreground line-through")}>
                <p className="tabular-nums">
                  {formatTime(new Date(session.starts_at), timeZone)}–{formatTime(new Date(session.ends_at), timeZone)}
                </p>
                <p className={cn(session.kind === "exam" ? "font-semibold" : "font-medium")}>
                  {session.courses ? (
                    <>
                      <Link href={coursePath(session.courses.code)} className="underline-offset-4 hover:underline">
                        {session.courses.code}
                      </Link>{" "}
                      {SESSION_TYPE_LABELS[session.kind].toLowerCase()}
                    </>
                  ) : (
                    session.title
                  )}
                </p>
                {session.location && (
                  <p title={session.location} className="text-tertiary-foreground">
                    {shortLocation(session.location)}
                  </p>
                )}
                {session.cancelled && <p>Cancelled</p>}
              </li>
            ))}
            {day.due.map((assignment) => (
              <li key={assignment.id} className="flex flex-col gap-1 border-t border-separator pt-2">
                <p className="text-tertiary-foreground">
                  Due {assignment.due_at && formatTime(new Date(assignment.due_at), timeZone)} · {assignment.courses?.code}
                </p>
                <a href={assignment.html_url} target="_blank" rel="noopener noreferrer" className="font-medium underline-offset-4 hover:underline">
                  {assignment.title}
                </a>
                <StatusPill status={assignmentStatus(assignment, now)} className="self-start" />
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}

/** "October 2026" for a month, "26 Oct – 1 Nov 2026" for a week. */
function formatRangeTitle(view: CalendarView, first: string, last: string): string {
  const format = (day: string, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));
  if (view === "month") return format(first, { month: "long", year: "numeric" });
  return `${format(first, { day: "numeric", month: "short" })} – ${format(last, { day: "numeric", month: "short", year: "numeric" })}`;
}
