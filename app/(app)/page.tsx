import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { StatusPill } from "@/components/assignments/status-pill";
import { AutoSync } from "@/components/dashboard/auto-sync";
import { MonthCalendar } from "@/components/dashboard/month-calendar";
import { TodoList } from "@/components/dashboard/todo-list";
import { PAGE_CLASS } from "@/components/page-header";
import { TokenExpiredBanner } from "@/components/settings/token-expired-banner";
import { DashboardSkeleton } from "@/components/skeletons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { excerpt } from "@/lib/announcements/text";
import { assignmentStatus, formatDueIn } from "@/lib/assignments/status";
import { canvasSettingsUrl } from "@/lib/canvas/links";
import { coursePath } from "@/lib/courses/slug";
import { addDays, daysBetween, dueSoon, formatCountdown, nextExam, sessionsOn, weekAgenda } from "@/lib/dashboard/agenda";
import { PATHWAY_COURSE_COLUMNS, summarizeTerms } from "@/lib/pathway/summarize";
import { categoryClass } from "@/lib/setup/setup";
import { createClient } from "@/lib/supabase/server";
import { formatRelativeTime, isStale } from "@/lib/sync/format";
import { dayKey, formatDay, formatTime, formatTimeRange, shortLocation } from "@/lib/timetable/format";
import { SESSION_TYPE_LABELS, sessionLabel } from "@/lib/timetable/kind";
import { cn } from "@/lib/utils";

// The auto-sync and the refresh button run their Server Actions under this page's limit, so give
// a sync room to finish (as on Settings).
export const maxDuration = 60;

const DUE_LIMIT = 8;
const TODO_LIMIT = 6;
const ANNOUNCEMENT_LIMIT = 3;

export default function DashboardPage() {
  return (
    <main className={cn(PAGE_CLASS, "gap-6")}>
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard />
      </Suspense>
    </main>
  );
}

type CourseRef = { code: string; type: { color: number } | null } | null;

async function Dashboard() {
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

  // One window covers this month (for the calendar) and the coming week, with a day's slack at
  // each end for time zones.
  const windowStart = `${addDays(`${today.slice(0, 8)}01`, -1)}T00:00:00Z`;
  const windowEnd = `${addDays(today, 40)}T00:00:00Z`;

  const [sessionsResult, assignmentsResult, announcementsResult, unreadResult, todosResult, lastRunResult, lastSuccessResult] =
    await Promise.all([
      supabase
        .from("class_sessions")
        .select("id, kind, title, starts_at, ends_at, location, cancelled, courses(code, type:course_types(color))")
        .gte("starts_at", windowStart)
        .lt("starts_at", windowEnd)
        .order("starts_at"),
      supabase
        .from("assignments")
        .select("id, title, kind, due_at, html_url, workflow_state, score, submitted_at, progress, courses(code, type:course_types(color))")
        .eq("deleted_in_canvas", false)
        .gte("due_at", windowStart)
        .lt("due_at", windowEnd)
        .order("due_at"),
      supabase
        .from("announcements")
        .select("id, title, message, posted_at, courses(code, type:course_types(color))")
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

  const sessions = sessionsResult.data ?? [];
  const assignments = assignmentsResult.data ?? [];
  const todaySessions = sessionsOn(sessions, today, timeZone);
  const due = dueSoon(assignments, now);
  const exam = nextExam(sessions, assignments, now);
  const examItem = exam && (exam.source === "session" ? sessions.find((s) => s.id === exam.id) : assignments.find((a) => a.id === exam.id));
  const week = weekAgenda(sessions, assignments, addDays(today, 1), timeZone, 6);

  const deadlines = new Map<string, number>();
  for (const assignment of assignments) {
    if (!assignment.due_at) continue;
    const day = dayKey(new Date(assignment.due_at), timeZone);
    deadlines.set(day, (deadlines.get(day) ?? 0) + 1);
  }
  const examDays = new Set([
    ...sessions.filter((s) => s.kind === "exam" && !s.cancelled).map((s) => dayKey(new Date(s.starts_at), timeZone)),
    ...assignments.filter((a) => a.kind === "exam" && a.due_at).map((a) => dayKey(new Date(a.due_at ?? ""), timeZone)),
  ]);

  const lastRun = lastRunResult.data;
  const lastSuccessAt = lastSuccessResult.data?.finished_at ?? null;
  const currentCourses = (currentTerm?.courses ?? []).map((course) => ({ id: course.id, code: course.code }));
  const todos = (todosResult.data ?? []).map((todo) => ({ ...todo, course: todo.courses }));

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

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Today</CardTitle>
            </CardHeader>
            <CardContent>
              {todaySessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No classes today.</p>
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {todaySessions.map((session) => {
                    const course = session.courses;
                    const over = new Date(session.ends_at) < now;
                    return (
                      <li key={session.id} className={cn("flex gap-3 text-sm", (over || session.cancelled) && "text-muted-foreground")}>
                        <span className="w-24 shrink-0 tabular-nums">
                          {formatTimeRange(new Date(session.starts_at), new Date(session.ends_at), timeZone)}
                        </span>
                        <span className="min-w-0">
                          {course ? <CourseLink course={course} /> : <span className="font-medium">{session.title}</span>}
                          <span
                            title={session.location ?? undefined}
                            className={cn("block text-xs text-tertiary-foreground", session.cancelled && "line-through")}
                          >
                            {[course && SESSION_TYPE_LABELS[session.kind], session.location && shortLocation(session.location)].filter(Boolean).join(" · ")}
                          </span>
                          {session.cancelled && <span className="text-xs">Cancelled</span>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
              {exam && examItem && (
                <div className="mt-4 rounded-xl bg-fill-tertiary p-3">
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Next exam</p>
                  <p className="mt-1 text-headline">
                    {formatCountdown(daysBetween(today, dayKey(new Date(exam.at), timeZone)))}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {examItem.courses?.code ?? examItem.title} · {formatDay(new Date(exam.at), timeZone)} {formatTime(new Date(exam.at), timeZone)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent>
              <MonthCalendar today={today} deadlines={deadlines} exams={examDays} />
            </CardContent>
          </Card>
        </div>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Due</CardTitle>
          </CardHeader>
          <CardContent>
            {due.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing due in the next three days.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {due.slice(0, DUE_LIMIT).map((assignment) => (
                  <li key={assignment.id} className="flex items-start gap-3">
                    <div className="min-w-0 flex-1 text-sm">
                      <a href={assignment.html_url} target="_blank" rel="noopener noreferrer" className="font-medium underline-offset-4 hover:underline">
                        {assignment.title}
                      </a>
                      <p className="text-xs text-tertiary-foreground">
                        <CourseLink course={assignment.courses} plain /> ·{" "}
                        {assignment.due_at && `${formatDay(new Date(assignment.due_at), timeZone)} ${formatTime(new Date(assignment.due_at), timeZone)} · ${formatDueIn(assignment.due_at, now)}`}
                      </p>
                    </div>
                    <StatusPill status={assignmentStatus(assignment, now)} />
                  </li>
                ))}
              </ul>
            )}
            {due.length > DUE_LIMIT && <p className="mt-3 text-xs text-tertiary-foreground">And {due.length - DUE_LIMIT} more this week.</p>}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
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
                          <Link href={coursePath(course.code)} className="font-medium underline-offset-4 hover:underline">
                            {announcement.title}
                          </Link>
                        ) : (
                          <p className="font-medium">{announcement.title}</p>
                        )}
                        <p className="text-xs text-tertiary-foreground">
                          {[course?.code, announcement.posted_at && formatDay(new Date(announcement.posted_at), timeZone)].filter(Boolean).join(" · ")}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{excerpt(announcement.message, 140)}</p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Below the fold: the rest of the week, day by day. */}
      <section aria-labelledby="week-heading" className="flex flex-col gap-3 pt-4">
        <h2 id="week-heading" className="text-title-3">
          This week
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {week.map(({ day, sessions: daySessions, due: dayDue }) => (
            <Card key={day} size="sm">
              <CardHeader>
                <CardTitle>{formatDay(new Date(`${day}T12:00:00Z`), "UTC")}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1.5 text-sm">
                {daySessions.length === 0 && dayDue.length === 0 && <p className="text-muted-foreground">Free.</p>}
                {daySessions.map((session) => (
                  <p key={session.id} className={cn(session.cancelled && "text-muted-foreground line-through")}>
                    <span className="tabular-nums">{formatTime(new Date(session.starts_at), timeZone)}</span>{" "}
                    {sessionLabel(session)}
                    {session.location && (
                      <span title={session.location} className="text-tertiary-foreground">
                        {" "}
                        · {shortLocation(session.location)}
                      </span>
                    )}
                  </p>
                ))}
                {dayDue.map((assignment) => (
                  <p key={assignment.id} className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate">
                      <span className="text-tertiary-foreground">Due </span>
                      {assignment.title}
                    </span>
                    <StatusPill status={assignmentStatus(assignment, now)} />
                  </p>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}

/** A course code linking to its page, with its type's colour dot. */
function CourseLink({ course, plain = false }: { course: CourseRef; plain?: boolean }) {
  if (!course) return null;
  return (
    <Link
      href={coursePath(course.code)}
      className={cn("inline-flex items-center gap-1.5 underline-offset-4 hover:underline", !plain && "font-medium", categoryClass(course.type?.color ?? 0))}
    >
      {!plain && <span aria-hidden className="size-2 rounded-full bg-(--course)" />}
      {course.code}
    </Link>
  );
}

/** "Tuesday 27 October". */
function formatLongDay(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone }).format(date);
}
