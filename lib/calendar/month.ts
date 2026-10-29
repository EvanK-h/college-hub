// What one day of the month view shows, picked by pure functions so the rules are tested here.
import { assignmentStatus, type AssignmentStatus, type StatusInput } from "@/lib/assignments/status";

type MonthSession = { id: string; kind: string; title: string; cancelled: boolean; courses: { code: string } | null };
type MonthAssignment = StatusInput & { id: string; title: string; courses: { code: string } | null };

export type MonthEntry =
  | { kind: "exam"; id: string; label: string }
  | { kind: "event"; id: string; label: string }
  | { kind: "due"; id: string; label: string; code: string | null; status: AssignmentStatus };

/** A cell lists at most this many entries, then "+N more". */
export const MONTH_CELL_ENTRIES = 3;

// The most urgent status a day's deadlines have decides its dot.
const URGENCY: AssignmentStatus[] = ["overdue", "due_soon", "in_progress", "not_started", "missed", "done"];

/**
 * A day's entries for a month cell: exams first, then deadlines, then events that aren't classes
 * of your courses. Those classes are counted, not listed, since most weekdays have several.
 * Cancelled sessions are left out.
 */
export function monthDay(
  sessions: readonly MonthSession[],
  due: readonly MonthAssignment[],
  now: Date,
  examLabel: (session: MonthSession) => string,
) {
  const live = sessions.filter((session) => !session.cancelled);
  const entries: MonthEntry[] = [
    ...live.filter((session) => session.kind === "exam").map((session) => ({ kind: "exam" as const, id: session.id, label: examLabel(session) })),
    ...due.map((assignment) => ({
      kind: "due" as const,
      id: assignment.id,
      label: assignment.title,
      code: assignment.courses?.code ?? null,
      status: assignmentStatus(assignment, now),
    })),
    ...live.filter((session) => !session.courses && session.kind !== "exam").map((session) => ({ kind: "event" as const, id: session.id, label: session.title })),
  ];
  const classes = live.filter((session) => session.courses && session.kind !== "exam").length;
  const statuses = entries.flatMap((entry) => (entry.kind === "due" ? [entry.status] : []));
  return {
    shown: entries.slice(0, MONTH_CELL_ENTRIES),
    more: Math.max(0, entries.length - MONTH_CELL_ENTRIES),
    classes,
    // For the phone's compact month: one dot per kind of thing on the day.
    dots: {
      exam: entries.some((entry) => entry.kind === "exam"),
      due: URGENCY.find((status) => statuses.includes(status)) ?? null,
      busy: classes > 0 || entries.some((entry) => entry.kind === "event"),
    },
  };
}
