// What the dashboard shows, picked out of sessions and assignments by pure functions so the rules
// ("due soon", "today", "next exam") are tested in one place. Days are calendar days in the term's
// time zone, never UTC days.
import { isFinished, type StatusInput } from "@/lib/assignments/status";
import { dayKey } from "@/lib/timetable/format";

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

export const DUE_WINDOW_HOURS = 72;
// Overdue work older than this is left off the dashboard (it is still on the course page), so a
// paper assignment Canvas never marks as handed in doesn't sit there all term.
export const OVERDUE_WINDOW_DAYS = 7;

export type AgendaSession = { id: string; starts_at: string; ends_at: string; kind: string; cancelled: boolean };
export type AgendaAssignment = StatusInput & { id: string; kind: string };

/** Sessions on the same calendar day as `now`, in start order, cancelled ones included. */
export function sessionsOn<T extends AgendaSession>(sessions: readonly T[], day: string, timeZone: string): T[] {
  return sessions
    .filter((session) => dayKey(new Date(session.starts_at), timeZone) === day)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

/**
 * Unfinished assignments due within the next 72 hours, plus overdue ones from the last week,
 * soonest first (so overdue work leads).
 */
export function dueSoon<T extends AgendaAssignment>(assignments: readonly T[], now: Date): T[] {
  const from = now.getTime() - OVERDUE_WINDOW_DAYS * DAY_MS;
  const to = now.getTime() + DUE_WINDOW_HOURS * HOUR_MS;
  return assignments
    .filter((assignment) => {
      if (!assignment.due_at || isFinished(assignment)) return false;
      const due = new Date(assignment.due_at).getTime();
      return due >= from && due <= to;
    })
    .sort((a, b) => (a.due_at ?? "").localeCompare(b.due_at ?? ""));
}

export type NextExam =
  | { source: "session"; id: string; at: string }
  | { source: "assignment"; id: string; at: string };

/** The soonest exam still ahead: an exam in the timetable, or an exam-kind assignment in Canvas. */
export function nextExam(sessions: readonly AgendaSession[], assignments: readonly AgendaAssignment[], now: Date): NextExam | null {
  const candidates: NextExam[] = [
    ...sessions
      .filter((session) => session.kind === "exam" && !session.cancelled && new Date(session.ends_at) > now)
      .map((session) => ({ source: "session" as const, id: session.id, at: session.starts_at })),
    ...assignments
      .filter((assignment) => assignment.kind === "exam" && assignment.due_at && new Date(assignment.due_at) > now && !isFinished(assignment))
      .map((assignment) => ({ source: "assignment" as const, id: assignment.id, at: assignment.due_at ?? "" })),
  ];
  return candidates.sort((a, b) => a.at.localeCompare(b.at))[0] ?? null;
}

/** Whole calendar days from today to `day`, both "YYYY-MM-DD" in the same zone. */
export function daysBetween(today: string, day: string): number {
  return Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY_MS);
}

/** "today", "tomorrow", "in 5 days". */
export function formatCountdown(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

/** "YYYY-MM-DD" plus `days`, as a date string. */
export function addDays(day: string, days: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** The next `count` calendar days starting with `today`, each with its sessions and due assignments. */
export function weekAgenda<S extends AgendaSession, A extends AgendaAssignment>(
  sessions: readonly S[],
  assignments: readonly A[],
  today: string,
  timeZone: string,
  count = 7,
): { day: string; sessions: S[]; due: A[] }[] {
  return Array.from({ length: count }, (_, index) => {
    const day = addDays(today, index);
    return {
      day,
      sessions: sessionsOn(sessions, day, timeZone),
      due: assignments
        .filter((assignment) => assignment.due_at && dayKey(new Date(assignment.due_at), timeZone) === day)
        .sort((a, b) => (a.due_at ?? "").localeCompare(b.due_at ?? "")),
    };
  });
}

/**
 * The weeks of a month for a calendar grid, Monday first (the UK convention, and how the London
 * timetable is laid out). Days outside the month are null.
 */
export function monthGrid(year: number, month: number): (string | null)[][] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const leading = (first.getUTCDay() + 6) % 7; // Monday = 0
  const cells: (string | null)[] = [
    ...Array<null>(leading).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => new Date(Date.UTC(year, month - 1, index + 1)).toISOString().slice(0, 10)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, week) => cells.slice(week * 7, week * 7 + 7));
}
