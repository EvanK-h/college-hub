import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { ProgressMenu } from "@/components/assignments/progress-menu";
import { StatusPill } from "@/components/assignments/status-pill";
import { AnnouncementList } from "@/components/courses/announcement-list";
import { GradeBreakdown } from "@/components/courses/grade-breakdown";
import { GradeCalculator } from "@/components/courses/grade-calculator";
import { ClearPendingCourse, PendingCourseHeader } from "@/components/courses/course-morph";
import { NotesForm } from "@/components/courses/notes-form";
import { PAGE_CLASS, PageHeader } from "@/components/page-header";
import { CourseSkeleton } from "@/components/skeletons";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ASSIGNMENT_KIND_LABELS, assignmentStatus, formatDueIn } from "@/lib/assignments/status";
import { canvasCourseUrl } from "@/lib/canvas/links";
import { codeFromSlug, courseSlug, courseTitleName } from "@/lib/courses/slug";
import { courseGrade, gradeContributions, letterGrade, namesItsWeight, type GradeGroup, type GradeItem } from "@/lib/grades/calculator";
import { loadSetup } from "@/lib/setup/load";
import { categoryClass } from "@/lib/setup/setup";
import { createClient } from "@/lib/supabase/server";
import { formatDay, formatTime, formatTimeRange, shortLocation } from "@/lib/timetable/format";
import { SESSION_TYPE_LABELS } from "@/lib/timetable/kind";
import { cn } from "@/lib/utils";

const UPCOMING_SESSIONS = 6;
const ANNOUNCEMENT_LIMIT = 20;

// The course comes from the URL and your session, so it is runtime data: it sits inside a
// Suspense boundary and the page shell prerenders around it (see the Cache Components decision).
export default function CoursePage({ params }: PageProps<"/courses/[code]">) {
  return (
    <main className={PAGE_CLASS}>
      <Suspense fallback={<CourseSkeleton header={(bones) => <PendingCourseHeader fallback={bones} />} />}>
        {params.then(({ code }) => (
          <Course slug={code} />
        ))}
      </Suspense>
    </main>
  );
}

async function Course({ slug }: { slug: string }) {
  const code = codeFromSlug(slug);
  if (!code) notFound();

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  // The proxy already redirects signed-out visitors; this is a second check in case it is ever bypassed.
  if (!claims?.claims) redirect("/login");

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, code, title, notes, canvas_course_id, terms(name, time_zone), type:course_types(name, color)")
    .eq("code", code)
    .maybeSingle();
  if (courseError) throw new Error(`Loading the course failed: ${courseError.message}`);
  if (!course) notFound();

  const now = new Date();
  const [groupsResult, assignmentsResult, announcementsResult, sessionsResult, setup] = await Promise.all([
    supabase.from("assignment_groups").select("canvas_id, name, weight, position").eq("course_id", course.id).order("position"),
    supabase
      .from("assignments")
      .select("id, assignment_group_id, title, kind, due_at, points_possible, html_url, workflow_state, score, submitted_at, progress")
      .eq("course_id", course.id)
      .eq("deleted_in_canvas", false)
      .order("due_at", { ascending: true, nullsFirst: false }),
    supabase
      .from("announcements")
      .select("id, title, message, author, posted_at, html_url, read, important")
      .eq("course_id", course.id)
      .eq("deleted_in_canvas", false)
      .order("posted_at", { ascending: false })
      .limit(ANNOUNCEMENT_LIMIT),
    supabase
      .from("class_sessions")
      .select("id, kind, title, starts_at, ends_at, location, cancelled")
      .eq("course_id", course.id)
      .gte("ends_at", now.toISOString())
      .order("starts_at")
      .limit(UPCOMING_SESSIONS),
    loadSetup(),
  ]);
  for (const result of [groupsResult, assignmentsResult, announcementsResult, sessionsResult]) {
    if (result.error) throw new Error(`Loading the course failed: ${result.error.message}`);
  }
  const groups = groupsResult.data ?? [];
  const assignments = assignmentsResult.data ?? [];
  const sessions = sessionsResult.data ?? [];

  const timeZone = course.terms?.time_zone ?? "UTC";
  const canvasUrl = course.canvas_course_id ? canvasCourseUrl(course.canvas_course_id) : null;

  const gradeGroups: GradeGroup[] = groups.map((group) => ({ id: group.canvas_id, name: group.name, weight: group.weight }));
  const gradeItems: GradeItem[] = assignments.map((assignment) => ({
    groupId: assignment.assignment_group_id ?? -1,
    pointsPossible: assignment.points_possible,
    score: assignment.score,
  }));
  const grade = courseGrade(gradeGroups, gradeItems);
  const groupGrade = new Map(grade.groups.map((group) => [group.id, group]));

  return (
    <>
      <PageHeader
        back={{ href: "/courses", label: "Courses" }}
        eyebrow={[course.code, course.type?.name, course.terms?.name].filter(Boolean).join(" · ")}
        title={course.title}
        shareName={courseTitleName(courseSlug(course.code))}
        // The course type's bar, as on its pathway card and course card.
        marker={<span aria-hidden className={cn("w-1.5 shrink-0 rounded-full bg-(--course)", categoryClass(course.type?.color ?? 5))} />}
      >
        {canvasUrl && (
          <a
            href={canvasUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "self-start")}
          >
            Open in Canvas
            <ExternalLink aria-hidden data-icon="inline-end" />
          </a>
        )}
      </PageHeader>
      <ClearPendingCourse />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-labelledby="assignments-heading" className="flex flex-col gap-4">
          <h2 id="assignments-heading" className="text-title-3">
            Assignments
          </h2>
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {course.canvas_course_id ? "Nothing synced from Canvas yet." : "Link this course to Canvas in Settings to see its assignments."}
            </p>
          ) : (
            // One card for every group: each group is a subheader carrying its weight and how it's
            // going, so a group of one assignment doesn't make a card of its own.
            <Card className="gap-0 py-0">
              {groups.map((group) => {
                const totals = groupGrade.get(group.canvas_id);
                const inGroup = assignments.filter((assignment) => assignment.assignment_group_id === group.canvas_id);
                return (
                  <section key={group.canvas_id} aria-labelledby={`group-${group.canvas_id}`} className="border-separator not-first:border-t">
                    <div className="flex items-baseline justify-between gap-3 bg-fill-tertiary px-5 pt-3 pb-2">
                      <h3 id={`group-${group.canvas_id}`} className="text-sm font-semibold">
                        {group.name}
                      </h3>
                      <p className="text-xs text-tertiary-foreground tabular-nums">
                        {[
                          grade.weighted && group.weight && !namesItsWeight(group.name) ? `${group.weight}% of grade` : null,
                          totals?.percent != null ? `${totals.percent.toFixed(1)}% so far` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    {inGroup.length === 0 ? (
                      <p className="px-5 pb-3 text-sm text-muted-foreground">No assignments.</p>
                    ) : (
                      <ul className="divide-y divide-separator">
                        {inGroup.map((assignment) => {
                          const status = assignmentStatus(assignment, now);
                          // Still worth starting: not handed in, and not long past its deadline.
                          const open = status !== "done" && status !== "missed";
                          return (
                            <li key={assignment.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
                              <div className="min-w-0 flex-1 basis-56">
                                <a
                                  href={assignment.html_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={cn("font-medium underline-offset-4 hover:underline", status === "missed" && "text-muted-foreground")}
                                >
                                  {assignment.title}
                                </a>
                                <p className="mt-0.5 text-xs text-tertiary-foreground">
                                  {[
                                    ASSIGNMENT_KIND_LABELS[assignment.kind],
                                    assignment.due_at &&
                                      `Due ${formatDay(new Date(assignment.due_at), timeZone)} ${formatTime(new Date(assignment.due_at), timeZone)}`,
                                    assignment.due_at && open && formatDueIn(assignment.due_at, now),
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </p>
                              </div>
                              <p className="text-sm text-muted-foreground tabular-nums">
                                {assignment.score !== null && assignment.points_possible
                                  ? `${assignment.score} / ${assignment.points_possible}`
                                  : assignment.points_possible
                                    ? `${assignment.points_possible} pts`
                                    : null}
                              </p>
                              {/* Your progress is yours to set until Canvas says it's handed in. */}
                              {open ? <ProgressMenu assignmentId={assignment.id} status={status} progress={assignment.progress} /> : <StatusPill status={status} />}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>
                );
              })}
            </Card>
          )}

          <section aria-labelledby="announcements-heading" className="mt-4 flex flex-col gap-3">
            <h2 id="announcements-heading" className="text-title-3">
              Announcements
            </h2>
            <AnnouncementList announcements={announcementsResult.data ?? []} timeZone={timeZone} />
          </section>
        </section>

        <aside className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Grade</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {grade.percent === null ? (
                <p className="text-sm text-muted-foreground">Nothing graded yet.</p>
              ) : (
                <p className="flex items-baseline gap-3">
                  <span className="text-large-title tabular-nums">{grade.percent.toFixed(1)}%</span>
                  <span className="text-title-3 text-muted-foreground">{letterGrade(grade.percent, setup.profile.gradeScale)}</span>
                </p>
              )}
              <GradeBreakdown parts={gradeContributions(grade)} />
              <p className="text-xs text-tertiary-foreground">
                {grade.weighted ? "Weighted by assignment group, from graded work only." : "Total points, from graded work only."}
              </p>
              {groups.length > 0 && <GradeCalculator groups={gradeGroups} items={gradeItems} scale={setup.profile.gradeScale} />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upcoming classes</CardTitle>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No classes in the timetable.</p>
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {sessions.map((session) => (
                    <li key={session.id} className={cn("text-sm", session.cancelled && "text-muted-foreground")}>
                      <p className={cn("font-medium", session.cancelled && "line-through")}>
                        {formatDay(new Date(session.starts_at), timeZone)} ·{" "}
                        {formatTimeRange(new Date(session.starts_at), new Date(session.ends_at), timeZone)}
                      </p>
                      <p title={session.location ?? undefined} className="text-xs text-tertiary-foreground">
                        {session.cancelled
                          ? "Cancelled"
                          : [SESSION_TYPE_LABELS[session.kind], session.location && shortLocation(session.location)].filter(Boolean).join(" · ")}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <NotesForm courseId={course.id} notes={course.notes} />
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}
