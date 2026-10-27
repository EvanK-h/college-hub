import { describe, expect, it } from "vitest";
import { assignmentStatus, formatDueIn, type StatusInput } from "./status";

const now = new Date("2026-10-27T12:00:00Z");
const hoursFromNow = (hours: number) => new Date(now.getTime() + hours * 3_600_000).toISOString();

const assignment = (overrides: Partial<StatusInput> = {}): StatusInput => ({
  due_at: hoursFromNow(24 * 7),
  workflow_state: "unsubmitted",
  score: null,
  submitted_at: null,
  progress: "not_started",
  ...overrides,
});

describe("assignmentStatus", () => {
  it("is not started by default", () => {
    expect(assignmentStatus(assignment(), now)).toBe("not_started");
  });

  it("follows your progress while nothing is urgent", () => {
    expect(assignmentStatus(assignment({ progress: "in_progress" }), now)).toBe("in_progress");
  });

  it("is due soon within 72 hours, even when in progress", () => {
    expect(assignmentStatus(assignment({ due_at: hoursFromNow(72) }), now)).toBe("due_soon");
    expect(assignmentStatus(assignment({ due_at: hoursFromNow(5), progress: "in_progress" }), now)).toBe("due_soon");
    expect(assignmentStatus(assignment({ due_at: hoursFromNow(73) }), now)).toBe("not_started");
  });

  it("is overdue once the deadline has passed without a submission", () => {
    expect(assignmentStatus(assignment({ due_at: hoursFromNow(-1) }), now)).toBe("overdue");
  });

  it.each([
    ["submitted", { workflow_state: "submitted", submitted_at: hoursFromNow(-2) }],
    ["graded", { workflow_state: "graded", score: 18 }],
    ["awaiting review", { workflow_state: "pending_review" }],
    ["scored without a submission (marked on paper)", { workflow_state: "unsubmitted", score: 9 }],
  ])("is done when %s, even past the deadline", (_name, overrides) => {
    expect(assignmentStatus(assignment({ due_at: hoursFromNow(-48), ...overrides }), now)).toBe("done");
  });

  it("is never due soon or overdue without a due date", () => {
    expect(assignmentStatus(assignment({ due_at: null }), now)).toBe("not_started");
  });
});

describe("formatDueIn", () => {
  it.each([
    [0.5, "in 30 min"],
    [0, "in 1 min"],
    [5, "in 5 h"],
    [47, "in 47 h"],
    [24 * 3, "in 3 d"],
    [-2, "2 h ago"],
    [-24 * 4, "4 d ago"],
  ])("%d h from now → %s", (hours, expected) => {
    expect(formatDueIn(hoursFromNow(hours), now)).toBe(expected);
  });
});
