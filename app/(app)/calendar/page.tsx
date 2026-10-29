import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { StatusPill, statusTextClass } from "@/components/assignments/status-pill";
import { CalendarKeys } from "@/components/calendar/calendar-keys";
import { PAGE_CLASS, PageHeader } from "@/components/page-header";
import { WeekGrid, type GridSession } from "@/components/calendar/week-grid";
import { CalendarSkeleton } from "@/components/skeletons";
import { TODAY_MARKER_CLASS } from "@/components/today-marker";
import { buttonVariants } from "@/components/ui/button";
import { ASSIGNMENT_STATUS_LABELS, assignmentStatus } from "@/lib/assignments/status";
import { monthDay } from "@/lib/calendar/month";
import { neighbours, parseCalendarParams, viewRange, type CalendarView } from "@/lib/calendar/params";
import { coursePath } from "@/lib/courses/slug";
import { addDays, daysBetween, monthGrid, weekAgenda } from "@/lib/dashboard/agenda";
import { PATHWAY_COURSE_COLUMNS, summarizeTerms } from "@/lib/pathway/summarize";
import { createClient } from "@/lib/supabase/server";
import { dayKey, formatDay, formatTime, shortLocation } from "@/lib/timetable/format";
import { SESSION_TYPE_LABELS } from "@/lib/timetable/kind";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// The view and date come from the URL, so they are runtime data inside a Suspense boundary. The
// URL arrives before the data, so a second boundary shows the skeleton of the view you asked for.
export default function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  return (
    <main className={PAGE_CLASS}>
      <Suspense fallback={<CalendarSkeleton />}>
        {searchParams.then((params) => (
          <Suspense fallback={<CalendarSkeleton view={params.view === "week" ? "week" : "month"} />}>
            <Calendar searchParams={params} />
          </Suspense>
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
  const unit = view === "month" ? "month" : "week";

  return (
    <>
      <PageHeader title={formatRangeTitle(view, first, last)}>
        <CalendarKeys
          links={{ previous: href({ date: previous }), next: href({ date: next }), today: href({ date: today }), month: href({ view: "month" }), week: href({ view: "week" }) }}
        />
        <nav aria-label="Calendar" className="mt-2 flex flex-wrap items-center gap-2">
          <Link
            href={href({ date: previous })}
            title={`Previous ${unit} (←)`}
            aria-keyshortcuts="ArrowLeft"
            className={buttonVariants({ variant: "outline", size: "icon-sm" })}
          >
            <ChevronLeft aria-hidden />
            <span className="sr-only">Previous {unit}</span>
          </Link>
          <Link href={href({ date: today })} title="Today (T)" aria-keyshortcuts="T" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Today
          </Link>
          <Link
            href={href({ date: next })}
            title={`Next ${unit} (→)`}
            aria-keyshortcuts="ArrowRight"
            className={buttonVariants({ variant: "outline", size: "icon-sm" })}
          >
            <ChevronRight aria-hidden />
            <span className="sr-only">Next {unit}</span>
          </Link>
          <span className="ml-2 inline-flex rounded-full bg-fill-secondary p-1">
            {(["month", "week"] as const).map((option) => (
              <Link
                key={option}
                href={href({ view: option })}
                title={`${option === "month" ? "Month" : "Week"} (${option === "month" ? "M" : "W"})`}
                aria-keyshortcuts={option === "month" ? "M" : "W"}
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
        <>
          <div className="hidden md:block">
            <MonthView first={first} byDay={byDay} today={today} now={now} href={href} />
          </div>
          <div className="md:hidden">
            <CompactMonth first={first} last={last} selected={date} byDay={byDay} today={today} now={now} timeZone={timeZone} href={href} />
          </div>
        </>
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

const examLabel = (session: { title: string; courses: { code: string } | null }) => session.courses?.code ?? session.title;

function MonthView({
  first,
  byDay,
  today,
  now,
  href,
}: {
  first: string;
  byDay: ReadonlyMap<string, Day>;
  today: string;
  now: Date;
  href: (target: { view?: CalendarView; date?: string }) => string;
}) {
  const [year, month] = first.split("-").map(Number) as [number, number];
  return (
    <table className="w-full table-fixed border-separate border-spacing-1 text-xs">
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
              const { shown, more, classes } = monthDay(entry?.sessions ?? [], entry?.due ?? [], now, examLabel);
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
                  {/* Each entry leads with its kind: a bold "Exam", ◇ for a deadline in its status
                      colour (◆ once it's done), ● for an event. Screen readers get the words. */}
                  <ul className="mt-1 flex flex-col gap-0.5">
                    {shown.map((item) => (
                      <li key={item.id} className="truncate">
                        {item.kind === "exam" ? (
                          <>
                            <span className="font-semibold">Exam</span> {item.label}
                          </>
                        ) : item.kind === "due" ? (
                          <>
                            <span aria-hidden className={cn("mr-1", statusTextClass(item.status))}>
                              {item.status === "done" ? "◆" : "◇"}
                            </span>
                            <span className="sr-only">Due, {ASSIGNMENT_STATUS_LABELS[item.status].toLowerCase()}: </span>
                            {item.code && <span className="text-tertiary-foreground">{item.code} </span>}
                            {item.label}
                          </>
                        ) : (
                          <>
                            <span aria-hidden className="mr-1 text-tertiary-foreground">
                              ●
                            </span>
                            {item.label}
                          </>
                        )}
                      </li>
                    ))}
                    {more > 0 && <li className="text-tertiary-foreground">+{more} more</li>}
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
  );
}

// The phone's month, the iOS way: a compact grid of dates with a dot for each kind of thing on a
// day (an exam, a deadline in its most urgent status's colour, classes or events), and the chosen
// day's agenda below. Choosing a date stays on the month and keeps the scroll position.
function CompactMonth({
  first,
  last,
  selected,
  byDay,
  today,
  now,
  timeZone,
  href,
}: {
  first: string;
  last: string;
  selected: string;
  byDay: ReadonlyMap<string, Day>;
  today: string;
  now: Date;
  timeZone: string;
  href: (target: { view?: CalendarView; date?: string }) => string;
}) {
  const [year, month] = first.split("-").map(Number) as [number, number];
  // ?date= picks the day; a month reached by the arrows starts on today if it's in it.
  const chosen = selected >= first && selected <= last ? selected : today >= first && today <= last ? today : first;
  const chosenDay = byDay.get(chosen);
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl bg-card p-2 shadow-card">
        <div aria-hidden className="grid grid-cols-7 pb-1 text-center text-xs font-medium text-tertiary-foreground">
          {WEEKDAYS.map((day) => (
            <span key={day}>{day.slice(0, 1)}</span>
          ))}
        </div>
        <ol className="grid grid-cols-7 gap-y-1">
          {monthGrid(year, month)
            .flat()
            .map((day, index) => {
              if (!day) return <li key={`pad-${index}`} aria-hidden />;
              const entry = byDay.get(day);
              const { dots, classes } = monthDay(entry?.sessions ?? [], entry?.due ?? [], now, examLabel);
              const summary = [dots.exam && "exam", dots.due && "deadline", classes > 0 && `${classes} class${classes > 1 ? "es" : ""}`]
                .filter(Boolean)
                .join(", ");
              return (
                <li key={day} className="flex justify-center">
                  <Link
                    href={href({ date: day })}
                    scroll={false}
                    aria-current={day === chosen ? "true" : undefined}
                    aria-label={`${formatDay(new Date(`${day}T12:00:00Z`), "UTC")}${day === today ? ", today" : ""}${summary ? `, ${summary}` : ""}`}
                    className="press flex w-11 flex-col items-center gap-0.5 rounded-xl py-1 focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <span
                      className={cn(
                        "inline-flex size-8 items-center justify-center rounded-full text-base tabular-nums",
                        day < today && "text-tertiary-foreground",
                        day === today ? TODAY_MARKER_CLASS : day === chosen && "bg-fill-secondary font-semibold",
                      )}
                    >
                      {Number(day.slice(8))}
                    </span>
                    <span aria-hidden className="flex h-1.5 gap-0.5">
                      {dots.exam && <span className="size-1.5 rounded-full bg-foreground" />}
                      {/* Hollow like the month's ◇, filled once done, so it reads apart from the classes dot. */}
                      {dots.due && (
                        <span className={cn("size-1.5 rounded-full ring-1 ring-current ring-inset", dots.due === "done" && "bg-current", statusTextClass(dots.due))} />
                      )}
                      {dots.busy && <span className="size-1.5 rounded-full bg-tertiary-foreground" />}
                    </span>
                  </Link>
                </li>
              );
            })}
        </ol>
      </div>
      {chosenDay && <DayCard day={chosenDay} today={today} timeZone={timeZone} now={now} />}
    </div>
  );
}

function WeekView({ days, today, timeZone, now }: { days: Day[]; today: string; timeZone: string; now: Date }) {
  return (
    <ol className="flex flex-col gap-3">
      {days.map((day) => (
        <li key={day.day}>
          <DayCard day={day} today={today} timeZone={timeZone} now={now} />
        </li>
      ))}
    </ol>
  );
}

// One day's classes and deadlines as a card: the phone's week list, and the day chosen in its month.
function DayCard({ day, today, timeZone, now }: { day: Day; today: string; timeZone: string; now: Date }) {
  const weekday = WEEKDAYS[(new Date(`${day.day}T12:00:00Z`).getUTCDay() + 6) % 7];
  return (
    <section
      aria-current={day.day === today ? "date" : undefined}
      className="flex flex-col gap-2 rounded-2xl bg-card p-3 shadow-card"
    >
      <h2 className="flex items-center gap-1 text-sm font-semibold">
        {weekday?.slice(0, 3)}
        <span className={cn("inline-flex size-6 items-center justify-center rounded-full tabular-nums", day.day === today && TODAY_MARKER_CLASS)}>
          {Number(day.day.slice(8))}
        </span>
      </h2>
      {day.sessions.length === 0 && day.due.length === 0 && <p className="text-xs text-tertiary-foreground">Free</p>}
      <ul className="flex flex-col gap-2 text-footnote">
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
    </section>
  );
}

/** "October 2026" for a month, "26 Oct – 1 Nov 2026" for a week. */
function formatRangeTitle(view: CalendarView, first: string, last: string): string {
  const format = (day: string, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));
  if (view === "month") return format(first, { month: "long", year: "numeric" });
  return `${format(first, { day: "numeric", month: "short" })} – ${format(last, { day: "numeric", month: "short", year: "numeric" })}`;
}
