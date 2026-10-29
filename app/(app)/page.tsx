import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleAlert, Clock, FileText, NotebookPen } from "lucide-react";
import { StatusPill } from "@/components/assignments/status-pill";
import { CourseCode } from "@/components/courses/course-code";
import { AutoSync } from "@/components/dashboard/auto-sync";
import { TodoList } from "@/components/dashboard/todo-list";
import { PAGE_CLASS } from "@/components/page-header";
import { TokenExpiredBanner } from "@/components/settings/token-expired-banner";
import { DashboardSkeleton } from "@/components/skeletons";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { excerpt } from "@/lib/announcements/text";
import { assignmentStatus, formatDueIn } from "@/lib/assignments/status";
import { canvasSettingsUrl } from "@/lib/canvas/links";
import { coursePath } from "@/lib/courses/slug";
import {
  addDays,
  currentOrNext,
  dayLabel,
  daysBetween,
  foldFreeDays,
  formatCountdown,
  nextDue,
  nextExam,
  OVERDUE_WINDOW_DAYS,
  recentlyOverdue,
  weekAgenda,
} from "@/lib/dashboard/agenda";
import { PATHWAY_COURSE_COLUMNS, summarizeTerms } from "@/lib/pathway/summarize";
import { createClient } from "@/lib/supabase/server";
import { formatRelativeTime, isStale } from "@/lib/sync/format";
import { dayKey, formatDay, formatTime, shortLocation } from "@/lib/timetable/format";
import { SESSION_TYPE_LABELS } from "@/lib/timetable/kind";
import { cn } from "@/lib/utils";

// The auto-sync and the refresh button run their Server Actions under this page's limit, so give
// a sync room to finish (as on Settings).
export const maxDuration = 60;

const AGENDA_DAYS = 7;
// How far ahead "next due" and "next exam" look.
const LOOKAHEAD_DAYS = 120;
const TODO_LIMIT = 6;
const ANNOUNCEMENT_LIMIT = 3;

export default function TodayPage() {
  return (
    <main className={cn(PAGE_CLASS, "gap-6")}>
      <Suspense fallback={<DashboardSkeleton />}>
        <Today />
      </Suspense>
    </main>
  );
}

type CourseRef = { code: string } | null;
type Session = {
  id: string;
  kind: keyof typeof SESSION_TYPE_LABELS;
  title: string;
  starts_at: string;
  ends_at: string;
  location: string | null;
  cancelled: boolean;
  courses: CourseRef;
};
type Assignment = {
  id: string;
  title: string;
  kind: string;
  due_at: string | null;
  html_url: string;
  workflow_state: string | null;
  score: number | null;
  submitted_at: string | null;
  progress: "not_started" | "in_progress";
  courses: CourseRef;
};

// What's happening now and next, then the week as one agenda, with to-dos and unread
// announcements beside it (the 2026-10-29 design roadmap decision).
async function Today() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  // The proxy already redirects signed-out visitors; this is a second check in case it is ever bypassed.
  if (!claims?.claims) redirect("/login");

  const now = new Date();
  const { data: terms, error: termsError } = await supabase
    .from("terms")
    .select(`id, name, kind, time_zone, courses(${PATHWAY_COURSE_COLUMNS})`)
    .order("id");
  if (termsError) throw new Error(`Loading terms failed: ${termsError.message}`);

  // Days and times follow the current term's zone (London now, Boston from Fall 2027).
  const currentTerm = summarizeTerms(terms).find((term) => term.phase === "current");
  const timeZone = terms.find((term) => term.id === currentTerm?.id)?.time_zone ?? "UTC";
  const today = dayKey(now, timeZone);

  // From a week back (for overdue work) to well ahead (for the next deadline and exam), with a
  // day's slack at each end for time zones.
  const windowStart = `${addDays(today, -OVERDUE_WINDOW_DAYS - 1)}T00:00:00Z`;
  const windowEnd = `${addDays(today, LOOKAHEAD_DAYS)}T00:00:00Z`;

  const [sessionsResult, assignmentsResult, announcementsResult, unreadResult, todosResult, lastRunResult, lastSuccessResult] =
    await Promise.all([
      supabase
        .from("class_sessions")
        .select("id, kind, title, starts_at, ends_at, location, cancelled, courses(code)")
        .gte("starts_at", windowStart)
        .lt("starts_at", windowEnd)
        .order("starts_at"),
      supabase
        .from("assignments")
        .select("id, title, kind, due_at, html_url, workflow_state, score, submitted_at, progress, courses(code)")
        .eq("deleted_in_canvas", false)
        .gte("due_at", windowStart)
        .lt("due_at", windowEnd)
        .order("due_at"),
      supabase
        .from("announcements")
        .select("id, title, message, posted_at, courses(code)")
        .eq("deleted_in_canvas", false)
        .eq("read", false)
        .order("posted_at", { ascending: false })
        .limit(ANNOUNCEMENT_LIMIT),
      supabase.from("announcements").select("id", { count: "exact", head: true }).eq("deleted_in_canvas", false).eq("read", false),
      supabase
        .from("todos")
        .select("id, title, due_on, courses(code)")
        .is("done_at", null)
        .order("due_on", { ascending: true, nullsFirst: false })
        .order("created_at")
        .limit(TODO_LIMIT),
      supabase.from("sync_runs").select("status, started_at, finished_at").eq("source", "canvas").order("started_at", { ascending: false }).limit(1).maybeSingle(),
      supabase
        .from("sync_runs")
        .select("finished_at")
        .eq("source", "canvas")
        .eq("status", "success")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
  for (const result of [sessionsResult, assignmentsResult, announcementsResult, unreadResult, todosResult, lastRunResult, lastSuccessResult]) {
    if (result.error) throw new Error(`Loading the dashboard failed: ${result.error.message}`);
  }

  const sessions: Session[] = sessionsResult.data ?? [];
  const assignments: Assignment[] = assignmentsResult.data ?? [];
  // "Next class" means your courses' classes; other timetable events still show in the agenda.
  const nextClass = currentOrNext(
    sessions.filter((session) => session.courses),
    now,
  );
  const due = nextDue(assignments, now);
  const overdue = recentlyOverdue(assignments, now);
  const exam = nextExam(sessions, assignments, now);
  const examItem = exam && (exam.source === "session" ? sessions.find((s) => s.id === exam.id) : assignments.find((a) => a.id === exam.id));
  const agenda = foldFreeDays(weekAgenda(sessions, assignments, today, timeZone, AGENDA_DAYS));

  const lastRun = lastRunResult.data;
  const lastSuccessAt = lastSuccessResult.data?.finished_at ?? null;
  const currentCourses = (currentTerm?.courses ?? []).map((course) => ({ id: course.id, code: course.code }));
  const todos = (todosResult.data ?? []).map((todo) => ({ ...todo, course: todo.courses }));
  const when = (iso: string) => {
    const date = new Date(iso);
    return `${dayLabel(dayKey(date, timeZone), today)} ${formatTime(date, timeZone)}`;
  };

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{currentTerm?.name ?? "Today"}</p>
          <h1 className="text-large-title">{formatLongDay(now, timeZone)}</h1>
        </div>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/settings" className="underline-offset-4 hover:underline">
            {lastSuccessAt ? `Synced ${formatRelativeTime(new Date(lastSuccessAt), now)}` : "Not synced yet"}
          </Link>
          <AutoSync stale={isStale(lastSuccessAt, now)} />
        </p>
      </header>

      {lastRun?.status === "token_expired" && (
        <TokenExpiredBanner detectedAt={lastRun.finished_at ?? lastRun.started_at} timeZone={timeZone} settingsUrl={canvasSettingsUrl()} />
      )}

      {/* Now / Next: never an empty card; when there's nothing, it says so in one line. */}
      <section aria-label="Now and next" className="grid gap-3 md:grid-cols-3">
        <Tile icon={Clock} label={nextClass?.live ? "Now" : "Next class"}>
          {nextClass?.session.courses ? (
            <>
              <TileTitle href={coursePath(nextClass.session.courses.code)}>
                {nextClass.session.courses.code} {SESSION_TYPE_LABELS[nextClass.session.kind].toLowerCase()}
              </TileTitle>
              <TileDetail title={nextClass.session.location ?? undefined}>
                {[
                  nextClass.live ? `Until ${formatTime(new Date(nextClass.session.ends_at), timeZone)}` : when(nextClass.session.starts_at),
                  nextClass.session.location && shortLocation(nextClass.session.location),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </TileDetail>
            </>
          ) : (
            <TileEmpty>No classes coming up.</TileEmpty>
          )}
        </Tile>

        <Tile icon={FileText} label="Next due">
          {due ? (
            <>
              <TileTitle href={due.html_url} external>
                {due.title}
              </TileTitle>
              <TileDetail>
                {[due.courses?.code, due.due_at && when(due.due_at), due.due_at && formatDueIn(due.due_at, now)].filter(Boolean).join(" · ")}
              </TileDetail>
            </>
          ) : (
            <TileEmpty>Nothing due.</TileEmpty>
          )}
          {overdue.length > 0 && (
            <a href="#overdue" className="mt-1 flex w-max items-center gap-1 text-sm font-medium text-status-overdue underline-offset-4 hover:underline">
              <CircleAlert aria-hidden className="size-4" />
              {overdue.length} overdue
            </a>
          )}
        </Tile>

        <Tile icon={NotebookPen} label="Next exam">
          {exam && examItem ? (
            <>
              <TileTitle href={examItem.courses ? coursePath(examItem.courses.code) : undefined}>
                {capitalize(formatCountdown(daysBetween(today, dayKey(new Date(exam.at), timeZone))))}
              </TileTitle>
              <TileDetail>{[examItem.courses?.code ?? examItem.title, when(exam.at)].join(" · ")}</TileDetail>
            </>
          ) : (
            <TileEmpty>No exams scheduled.</TileEmpty>
          )}
        </Tile>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-labelledby="agenda-heading" className="flex flex-col gap-3">
          <h2 id="agenda-heading" className="px-1 text-title-3">
            This week
          </h2>
          <ol className="divide-y divide-separator overflow-hidden rounded-2xl bg-card shadow-card">
            {overdue.length > 0 && (
              <li id="overdue" className="scroll-mt-20 px-4 py-3">
                <h3 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-status-overdue">
                  <CircleAlert aria-hidden className="size-4" />
                  Overdue
                </h3>
                <ul className="flex flex-col gap-1.5">
                  {overdue.map((assignment) => (
                    <DueRow key={assignment.id} assignment={assignment} now={now} time={assignment.due_at ? formatDay(new Date(assignment.due_at), timeZone) : ""} />
                  ))}
                </ul>
              </li>
            )}
            {agenda.map((entry) =>
              entry.kind === "free" ? (
                <li key={entry.from} className="flex items-baseline justify-between gap-3 px-4 py-2.5 text-sm">
                  <span className="text-muted-foreground">
                    {entry.from === entry.to ? dayLabel(entry.from, today) : `${dayLabel(entry.from, today)} – ${dayLabel(entry.to, today)}`}
                  </span>
                  <span className="text-tertiary-foreground">Free</span>
                </li>
              ) : (
                <li key={entry.day} aria-current={entry.day === today ? "date" : undefined} className="px-4 py-3">
                  <h3 className="mb-1.5 text-sm font-semibold">
                    {dayLabel(entry.day, today)}
                    {entry.day === today && (
                      <span className="ml-1.5 font-normal text-muted-foreground">{formatDay(new Date(`${entry.day}T12:00:00Z`), "UTC")}</span>
                    )}
                  </h3>
                  {entry.sessions.length === 0 && entry.due.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nothing scheduled.</p>
                  ) : (
                    <ul className="flex flex-col gap-1.5">
                      {entry.sessions.map((session) => (
                        <SessionRow key={session.id} session={session} now={now} timeZone={timeZone} />
                      ))}
                      {entry.due.map((assignment) => (
                        <DueRow
                          key={assignment.id}
                          assignment={assignment}
                          now={now}
                          time={assignment.due_at ? formatTime(new Date(assignment.due_at), timeZone) : ""}
                        />
                      ))}
                    </ul>
                  )}
                </li>
              ),
            )}
          </ol>
        </section>

        <div className="flex flex-col gap-4 lg:pt-10">
          <Card size="sm">
            <CardHeader>
              <CardTitle>To-dos</CardTitle>
            </CardHeader>
            <CardContent>
              <TodoList todos={todos} courses={currentCourses} today={today} />
            </CardContent>
          </Card>
          <Card size="sm">
            <CardHeader>
              <CardTitle>
                Announcements
                {(unreadResult.count ?? 0) > 0 && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground tabular-nums">{unreadResult.count} unread</span>
                )}
              </CardTitle>
              <CardAction>
                <Link href="/announcements" className="rounded-md text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                  See all
                </Link>
              </CardAction>
            </CardHeader>
            <CardContent>
              {(announcementsResult.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">You’re all caught up.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {(announcementsResult.data ?? []).map((announcement) => {
                    const course = announcement.courses;
                    return (
                      <li key={announcement.id} className="text-sm">
                        {course ? (
                          // Opens this announcement on its course page (see OpenAnnouncementFromHash).
                          <Link href={`${coursePath(course.code)}#announcement-${announcement.id}`} className="font-medium underline-offset-4 hover:underline">
                            {announcement.title}
                          </Link>
                        ) : (
                          <p className="font-medium">{announcement.title}</p>
                        )}
                        <p className="text-xs text-tertiary-foreground">
                          {[course?.code, announcement.posted_at && formatDay(new Date(announcement.posted_at), timeZone)].filter(Boolean).join(" · ")}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-footnote text-muted-foreground">{excerpt(announcement.message, 140)}</p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function Tile({ icon: Icon, label, children }: { icon: typeof Clock; label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-2xl bg-card p-4 shadow-card">
      <p className="mb-1 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Icon aria-hidden className="size-4" />
        {label}
      </p>
      {children}
    </div>
  );
}

function TileTitle({ href, external = false, children }: { href?: string; external?: boolean; children: ReactNode }) {
  const className = "truncate text-headline underline-offset-4 hover:underline";
  if (!href) return <p className="truncate text-headline">{children}</p>;
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  ) : (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

function TileDetail({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <p title={title} className="truncate text-sm text-muted-foreground">
      {children}
    </p>
  );
}

function TileEmpty({ children }: { children: ReactNode }) {
  return <p className="text-headline font-normal text-muted-foreground">{children}</p>;
}

/** A class or event in the agenda: time, what it is, where. Finished and cancelled ones recede. */
function SessionRow({ session, now, timeZone }: { session: Session; now: Date; timeZone: string }) {
  const over = new Date(session.ends_at) < now;
  return (
    <li className={cn("grid grid-cols-[6.5rem_minmax(0,1fr)] items-baseline gap-2 text-sm", (over || session.cancelled) && "text-muted-foreground")}>
      <span className="tabular-nums">
        {formatTime(new Date(session.starts_at), timeZone)}–{formatTime(new Date(session.ends_at), timeZone)}
      </span>
      <span className={cn("min-w-0 truncate", session.cancelled && "line-through")} title={session.location ?? undefined}>
        {session.courses ? (
          <>
            <Link href={coursePath(session.courses.code)} className="underline-offset-4 hover:underline">
              <CourseCode code={session.courses.code} />
            </Link>{" "}
            <span className="font-medium">{SESSION_TYPE_LABELS[session.kind]}</span>
          </>
        ) : (
          <span className="font-medium">{session.title}</span>
        )}
        {session.location && <span className="text-tertiary-foreground"> · {shortLocation(session.location)}</span>}
      </span>
      {session.cancelled && <span className="col-start-2 -mt-1 text-xs">Cancelled</span>}
    </li>
  );
}

/** A deadline in the agenda: when, what, which course, and its status. */
function DueRow({ assignment, now, time }: { assignment: Assignment; now: Date; time: string }) {
  return (
    <li className="grid grid-cols-[6.5rem_minmax(0,1fr)_auto] items-center gap-2 text-sm">
      <span className="text-tertiary-foreground tabular-nums">Due {time}</span>
      <span className="min-w-0 truncate">
        {assignment.courses && <CourseCode code={assignment.courses.code} className="mr-1.5" />}
        <a href={assignment.html_url} target="_blank" rel="noopener noreferrer" className="font-medium underline-offset-4 hover:underline">
          {assignment.title}
        </a>
      </span>
      <StatusPill status={assignmentStatus(assignment, now)} />
    </li>
  );
}

/** "Thursday 29 October". */
function formatLongDay(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone }).format(date);
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
