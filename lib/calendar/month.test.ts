import { describe, expect, it } from "vitest";
import { monthDay } from "./month";

const now = new Date("2026-10-29T12:00:00Z");
const label = (session: { title: string }) => `Exam: ${session.title}`;
const session = (id: string, kind: string, course: boolean, cancelled = false) => ({
  id,
  kind,
  title: id,
  cancelled,
  courses: course ? { code: "QA 2000" } : null,
});
const assignment = (id: string, due_at: string, submitted = false) => ({
  id,
  title: id,
  due_at,
  workflow_state: submitted ? "graded" : null,
  score: null,
  submitted_at: submitted ? due_at : null,
  progress: "not_started" as const,
  courses: { code: "QA 2000" },
});

describe("monthDay", () => {
  it("lists exams, then deadlines, then other events, and counts classes", () => {
    const day = monthDay(
      [session("lecture", "lecture", true), session("fair", "event", false), session("final", "exam", true)],
      [assignment("essay", "2026-10-30T12:00:00Z")],
      now,
      label,
    );
    expect(day.shown.map((entry) => entry.kind)).toEqual(["exam", "due", "event"]);
    expect(day.shown[0]?.label).toBe("Exam: final");
    expect(day.classes).toBe(1);
    expect(day.more).toBe(0);
  });

  it("shows three entries and counts the rest", () => {
    const due = ["a", "b", "c", "d", "e"].map((id) => assignment(id, "2026-11-20T12:00:00Z"));
    const day = monthDay([], due, now, label);
    expect(day.shown).toHaveLength(3);
    expect(day.more).toBe(2);
  });

  it("leaves cancelled sessions out", () => {
    const day = monthDay([session("lecture", "lecture", true, true), session("fair", "event", false, true)], [], now, label);
    expect(day.classes).toBe(0);
    expect(day.shown).toEqual([]);
    expect(day.dots).toEqual({ exam: false, due: null, busy: false });
  });

  it("gives the due dot the most urgent status", () => {
    const day = monthDay([], [assignment("done", "2026-10-28T12:00:00Z", true), assignment("late", "2026-10-28T12:00:00Z")], now, label);
    expect(day.dots.due).toBe("overdue");
  });
});
