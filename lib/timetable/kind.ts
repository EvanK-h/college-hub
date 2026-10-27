import type { Database } from "@/lib/database.types";

export type SessionType = Database["public"]["Enums"]["session_type"];

// Checked in order: "Lab exam" is an exam, and "Seminar (tutorial group B)" is a seminar.
const PATTERNS: [SessionType, RegExp][] = [
  ["exam", /\b(exam|examination|midterm|test)\b/i],
  ["lab", /\b(labs?|laboratory|practical)\b/i],
  ["seminar", /\bseminars?\b/i],
  ["tutorial", /\btutorials?\b/i],
  ["workshop", /\bworkshops?\b/i],
  ["lecture", /\blectures?\b/i],
];

/**
 * Guesses a session's type from its title and description. Like an assignment's kind, the sync
 * sends this only when it inserts a row; after that `kind` is yours to correct.
 */
export function guessSessionType(title: string, description = ""): SessionType {
  for (const text of [title, description]) {
    for (const [type, pattern] of PATTERNS) {
      if (pattern.test(text)) return type;
    }
  }
  return "other";
}

export const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  lecture: "Lecture",
  lab: "Lab",
  seminar: "Seminar",
  tutorial: "Tutorial",
  workshop: "Workshop",
  exam: "Exam",
  other: "Class",
};
