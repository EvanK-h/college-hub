import { describe, expect, it } from "vitest";
import {
  addDays,
  daysBetween,
  dueSoon,
  formatCountdown,
  monthGrid,
  nextExam,
  sessionsOn,
  weekAgenda,
  type AgendaAssignment,
  type AgendaSession,
} from "./agenda";

const LONDON = "Europe/London";
const now = new Date("2026-10-27T12:00:00Z"); // Tuesday
const hoursFromNow = (hours: number) => new Date(now.getTime() + hours * 3_600_000).toISOString();

const session = (id: string, startsAt: string, overrides: Partial<AgendaSession> = {}): AgendaSession => ({
  id,
  starts_at: startsAt,
  ends_at: new Date(new Date(startsAt).getTime() + 3_600_000).toISOString(),
  kind: "lecture",
  cancelled: false,
  ...overrides,
});

const assignment = (id: string, dueAt: string | null, overrides: Partial<AgendaAssignment> = {}): AgendaAssignment => ({
  id,
  kind: "assignment",
  due_at: dueAt,
  workflow_state: "unsubmitted",
  score: null,
  submitted_at: null,
  progress: "not_started",
  ...overrides,
});

describe("sessionsOn", () => {
  it("picks the day's sessions in the term's zone, in order", () => {
    const sessions = [
      session("late", "2026-10-27T15:00:00Z"),
      session("early", "2026-10-27T09:00:00Z"),
      session("tomorrow", "2026-10-28T09:00:00Z"),
      // 23:30 UTC on the 26th is still the 26th in London (GMT), so not today.
      session("yesterday", "2026-10-26T23:30:00Z"),
    ];
    expect(sessionsOn(sessions, "2026-10-27", LONDON).map((s) => s.id)).toEqual(["early", "late"]);
  });
});

describe("dueSoon", () => {
  it("keeps unfinished work due in the next 72 hours and overdue work from the last week, soonest first", () => {
    const list = dueSoon(
      [
        assignment("in-3-days", hoursFromNow(71)),
        assignment("in-4-days", hoursFromNow(97)),
        assignment("overdue", hoursFromNow(-30)),
        assignment("long-overdue", hoursFromNow(-24 * 8)),
        assignment("done", hoursFromNow(5), { workflow_state: "submitted" }),
        assignment("no-date", null),
      ],
      now,
    );
    expect(list.map((a) => a.id)).toEqual(["overdue", "in-3-days"]);
  });
});

describe("nextExam", () => {
  it("takes the soonest exam from the timetable or Canvas", () => {
    const sessions = [session("lecture", hoursFromNow(1)), session("exam-session", hoursFromNow(24 * 10), { kind: "exam" })];
    const assignments = [assignment("exam-quiz", hoursFromNow(24 * 3), { kind: "exam" })];
    expect(nextExam(sessions, assignments, now)).toEqual({ source: "assignment", id: "exam-quiz", at: hoursFromNow(72) });
  });

  it("skips past, cancelled and finished exams", () => {
    const sessions = [
      session("past", hoursFromNow(-48), { kind: "exam" }),
      session("cancelled", hoursFromNow(48), { kind: "exam", cancelled: true }),
    ];
    const assignments = [assignment("done", hoursFromNow(24), { kind: "exam", score: 40 })];
    expect(nextExam(sessions, assignments, now)).toBeNull();
  });

  it("still counts an exam that is under way", () => {
    const sessions = [session("now", hoursFromNow(-0.5), { kind: "exam" })];
    expect(nextExam(sessions, [], now)?.id).toBe("now");
  });
});

describe("countdown", () => {
  it("counts calendar days, not 24-hour periods", () => {
    expect(daysBetween("2026-10-27", "2026-10-27")).toBe(0);
    expect(daysBetween("2026-10-27", "2026-11-03")).toBe(7);
    // Across the March clock change, still whole days.
    expect(daysBetween("2027-03-27", "2027-03-29")).toBe(2);
  });

  it.each([
    [0, "today"],
    [1, "tomorrow"],
    [6, "in 6 days"],
  ])("%d → %s", (days, text) => {
    expect(formatCountdown(days)).toBe(text);
  });
});

describe("weekAgenda", () => {
  it("lists seven days from today with their sessions and deadlines", () => {
    const week = weekAgenda(
      [session("tue", "2026-10-27T09:00:00Z"), session("thu", "2026-10-29T09:00:00Z")],
      [assignment("wed", "2026-10-28T22:59:00Z"), assignment("next-week", "2026-11-05T12:00:00Z")],
      "2026-10-27",
      LONDON,
    );
    expect(week).toHaveLength(7);
    expect(week.map((d) => d.day)).toEqual([
      "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02",
    ]);
    expect(week[0]?.sessions.map((s) => s.id)).toEqual(["tue"]);
    expect(week[1]?.due.map((a) => a.id)).toEqual(["wed"]);
    expect(week[2]?.sessions.map((s) => s.id)).toEqual(["thu"]);
  });
});

describe("addDays", () => {
  it("crosses month and year ends", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("monthGrid", () => {
  it("starts weeks on Monday and pads with nulls", () => {
    // November 2026 starts on a Sunday, so six leading blanks.
    const weeks = monthGrid(2026, 11);
    expect(weeks[0]).toEqual([null, null, null, null, null, null, "2026-11-01"]);
    expect(weeks.at(-1)).toEqual(["2026-11-30", null, null, null, null, null, null]);
    expect(weeks).toHaveLength(6);
    expect(weeks.flat().filter(Boolean)).toHaveLength(30);
  });

  it("handles February in a leap year", () => {
    expect(monthGrid(2028, 2).flat().filter(Boolean)).toHaveLength(29);
  });
});
