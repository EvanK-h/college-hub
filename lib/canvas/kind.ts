import type { Database } from "@/lib/database.types";

export type AssignmentKind = Database["public"]["Enums"]["assignment_kind"];

// Canvas submission types that mean "nothing to hand in online".
const NO_ONLINE_SUBMISSION = new Set(["none", "not_graded", "on_paper"]);

/**
 * Guesses an assignment's kind from Canvas's submission types and its title. The sync sends this
 * only when it inserts a row; after that `kind` is yours to correct and a re-sync leaves it alone.
 * Order matters: an exam is often delivered as an online quiz, and "Lab Quiz" is a quiz.
 */
export function guessKind(submissionTypes: readonly string[], title: string): AssignmentKind {
  if (/\b(exam|midterm)\b|\bfinal\s+exam/i.test(title)) return "exam";
  if (submissionTypes.includes("discussion_topic")) return "discussion";
  if (submissionTypes.includes("online_quiz") || /\bquiz(zes)?\b/i.test(title)) return "quiz";
  if (/\blabs?\b|\blaboratory\b/i.test(title)) return "lab";

  const nothingToSubmit = submissionTypes.every((type) => NO_ONLINE_SUBMISSION.has(type));
  if (nothingToSubmit && /\b(reading|read|chapters?)\b/i.test(title)) return "reading";

  return "assignment";
}
