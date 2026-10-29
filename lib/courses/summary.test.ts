import { describe, expect, it } from "vitest";
import { summarizeCourse, type SummaryAssignment } from "./summary";

const now = new Date("2026-10-29T12:00:00Z");
const days = (n: number) => new Date(now.getTime() + n * 86_400_000).toISOString();

const assignment = (overrides: Partial<SummaryAssignment>): SummaryAssignment => ({
  course_id: "a",
  title: "Homework",
  assignment_group_id: 1,
  points_possible: 10,
  score: null,
  due_at: days(7),
  workflow_state: "unsubmitted",
  submitted_at: null,
  progress: "not_started",
  ...overrides,
});

const empty = { groups: [], assignments: [], sessions: [], unread: [] };

describe("summarizeCourse", () => {
  it("is empty for a course with nothing synced", () => {
    expect(summarizeCourse("a", empty, now)).toEqual({ grade: null, nextDue: null, overdue: 0, nextClass: null, unread: 0 });
  });

  it("grades from graded work only, with the letter from the scale", () => {
    const summary = summarizeCourse(
      "a",
      {
        ...empty,
        groups: [{ course_id: "a", canvas_id: 1, name: "Homework", weight: null }],
        assignments: [assignment({ score: 9, workflow_state: "graded", due_at: days(-7) }), assignment({ title: "Ungraded" })],
      },
      now,
    );
    expect(summary.grade).toEqual({ percent: 90, letter: "A−" });
  });

  it("picks the soonest unfinished deadline that hasn't passed", () => {
    const summary = summarizeCourse(
      "a",
      {
        ...empty,
        assignments: [
          assignment({ title: "Later", due_at: days(9) }),
          assignment({ title: "Handed in", due_at: days(1), submitted_at: days(-1), workflow_state: "submitted" }),
          assignment({ title: "Past", due_at: days(-1) }),
          assignment({ title: "Next", due_at: days(3) }),
          assignment({ title: "Other course", course_id: "b", due_at: days(2) }),
        ],
      },
      now,
    );
    expect(summary.nextDue).toEqual({ title: "Next", dueAt: days(3) });
  });

  it("counts overdue work, but not work long enough past to be missed", () => {
    const summary = summarizeCourse("a", { ...empty, assignments: [assignment({ due_at: days(-2) }), assignment({ due_at: days(-400) })] }, now);
    expect(summary.overdue).toBe(1);
  });

  it("finds the next class that isn't cancelled, and counts unread announcements", () => {
    const summary = summarizeCourse(
      "a",
      {
        ...empty,
        sessions: [
          { course_id: "a", kind: "lecture", starts_at: days(-1), cancelled: false },
          { course_id: "a", kind: "lab", starts_at: days(1), cancelled: true },
          { course_id: "b", kind: "lecture", starts_at: days(1), cancelled: false },
          { course_id: "a", kind: "seminar", starts_at: days(2), cancelled: false },
        ],
        unread: [{ course_id: "a" }, { course_id: "a" }, { course_id: "b" }],
      },
      now,
    );
    expect(summary.nextClass).toEqual({ kind: "seminar", startsAt: days(2) });
    expect(summary.unread).toBe(2);
  });
});
