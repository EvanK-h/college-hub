import { assignmentStatus, isFinished, type StatusInput } from "@/lib/assignments/status";
import { courseGrade, letterGrade } from "@/lib/grades/calculator";
import type { GradeScale } from "@/lib/setup/setup";
import type { SessionType } from "@/lib/timetable/kind";

// One card per course on /courses: where the grade stands, what's due next, when the next class
// is and what's unread. Derived at display time from synced rows, never stored.

export type SummaryAssignment = StatusInput & {
  course_id: string;
  title: string;
  assignment_group_id: number | null;
  points_possible: number | null;
};
export type SummaryGroup = { course_id: string; canvas_id: number; name: string; weight: number | null };
export type SummarySession = { course_id: string | null; kind: SessionType; starts_at: string; cancelled: boolean };

export type CourseSummary = {
  grade: { percent: number; letter: string } | null;
  nextDue: { title: string; dueAt: string } | null;
  /** Past the deadline and not handed in, but not yet long enough to count as missed. */
  overdue: number;
  nextClass: { kind: SessionType; startsAt: string } | null;
  unread: number;
};

export function summarizeCourse(
  courseId: string,
  data: {
    groups: readonly SummaryGroup[];
    assignments: readonly SummaryAssignment[];
    /** In start order. */
    sessions: readonly SummarySession[];
    /** One entry per unread announcement. */
    unread: readonly { course_id: string | null }[];
  },
  now: Date,
  scale?: GradeScale,
): CourseSummary {
  const assignments = data.assignments.filter((assignment) => assignment.course_id === courseId);
  const grade = courseGrade(
    data.groups.filter((group) => group.course_id === courseId).map((group) => ({ id: group.canvas_id, name: group.name, weight: group.weight })),
    assignments.map((assignment) => ({
      groupId: assignment.assignment_group_id ?? -1,
      pointsPossible: assignment.points_possible,
      score: assignment.score,
    })),
  );

  const upcoming = assignments
    .filter((assignment) => assignment.due_at !== null && new Date(assignment.due_at) >= now && !isFinished(assignment))
    .sort((a, b) => (a.due_at ?? "").localeCompare(b.due_at ?? ""))[0];
  const nextSession = data.sessions.find((session) => session.course_id === courseId && !session.cancelled && new Date(session.starts_at) >= now);

  return {
    grade: grade.percent === null ? null : { percent: grade.percent, letter: letterGrade(grade.percent, scale) },
    nextDue: upcoming?.due_at ? { title: upcoming.title, dueAt: upcoming.due_at } : null,
    overdue: assignments.filter((assignment) => assignmentStatus(assignment, now) === "overdue").length,
    nextClass: nextSession ? { kind: nextSession.kind, startsAt: nextSession.starts_at } : null,
    unread: data.unread.filter((announcement) => announcement.course_id === courseId).length,
  };
}
