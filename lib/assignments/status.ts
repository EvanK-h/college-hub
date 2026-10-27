import type { Database } from "@/lib/database.types";

export type AssignmentStatus = "done" | "overdue" | "due_soon" | "in_progress" | "not_started";

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  done: "Done",
  overdue: "Overdue",
  due_soon: "Due soon",
  in_progress: "In progress",
  not_started: "Not started",
};

export type StatusInput = {
  due_at: string | null;
  workflow_state: string | null;
  score: number | null;
  submitted_at: string | null;
  progress: Database["public"]["Enums"]["assignment_progress"];
};

const DUE_SOON_HOURS = 72;
// Canvas's states that mean "handed in" (pending_review is a submitted quiz awaiting marking).
const SUBMITTED_STATES = new Set(["submitted", "graded", "pending_review"]);

/** Handed in or graded in Canvas. A score counts too, for work marked on paper or in class. */
export function isFinished(assignment: Pick<StatusInput, "workflow_state" | "score" | "submitted_at">): boolean {
  return (
    SUBMITTED_STATES.has(assignment.workflow_state ?? "") || assignment.submitted_at !== null || assignment.score !== null
  );
}

/**
 * The status shown for an assignment, derived at display time and never stored. Canvas's state and
 * your own progress are combined, taking whichever is further along; a deadline that is close or
 * past outranks "in progress", since that is what needs attention.
 */
export function assignmentStatus(assignment: StatusInput, now: Date): AssignmentStatus {
  if (isFinished(assignment)) return "done";
  if (assignment.due_at) {
    const hoursLeft = (new Date(assignment.due_at).getTime() - now.getTime()) / 3_600_000;
    if (hoursLeft < 0) return "overdue";
    if (hoursLeft <= DUE_SOON_HOURS) return "due_soon";
  }
  return assignment.progress === "in_progress" ? "in_progress" : "not_started";
}

/** "in 40 min", "in 5 h", "in 3 d", "2 h ago", "4 d ago". */
export function formatDueIn(dueAt: string, now: Date): string {
  const minutes = Math.round((new Date(dueAt).getTime() - now.getTime()) / 60_000);
  const size = Math.abs(minutes);
  const amount = size < 60 ? `${Math.max(size, 1)} min` : size < 48 * 60 ? `${Math.round(size / 60)} h` : `${Math.round(size / 1440)} d`;
  return minutes >= 0 ? `in ${amount}` : `${amount} ago`;
}

export const ASSIGNMENT_KIND_LABELS: Record<Database["public"]["Enums"]["assignment_kind"], string> = {
  assignment: "Assignment",
  quiz: "Quiz",
  exam: "Exam",
  discussion: "Discussion",
  lab: "Lab",
  reading: "Reading",
};
