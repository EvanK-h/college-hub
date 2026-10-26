import { describe, expect, it } from "vitest";
import {
  canvasAnnouncementSchema,
  canvasAssignmentGroupSchema,
  canvasAssignmentSchema,
  canvasCourseSchema,
} from "./schemas";

// All fixtures are invented; none of this is real Canvas data.
const assignment = {
  id: 9001,
  name: "Problem Set 3",
  assignment_group_id: 501,
  due_at: "2026-11-02T23:59:00Z",
  points_possible: 20,
  html_url: "https://canvas.example.edu/courses/101/assignments/9001",
  submission_types: ["online_upload"],
  submission: { workflow_state: "graded", score: 18.5, submitted_at: "2026-11-01T10:00:00Z" },
};

describe("canvasCourseSchema", () => {
  it("reads the current score from the enrollment", () => {
    const course = canvasCourseSchema.parse({
      id: 101,
      name: "Intro to Testing",
      course_code: "TEST 1000",
      enrollments: [{ type: "student", computed_current_score: 91.2, computed_current_grade: "A-" }],
    });
    expect(course.enrollments?.[0]).toEqual({ computed_current_score: 91.2, computed_current_grade: "A-" });
  });

  it("accepts a course with no enrollments or grade yet", () => {
    expect(canvasCourseSchema.safeParse({ id: 101, name: "Intro to Testing" }).success).toBe(true);
    expect(
      canvasCourseSchema.safeParse({
        id: 101,
        name: "Intro to Testing",
        enrollments: [{ computed_current_score: null, computed_current_grade: null }],
      }).success,
    ).toBe(true);
  });

  it("rejects a course without an id", () => {
    expect(canvasCourseSchema.safeParse({ name: "Intro to Testing" }).success).toBe(false);
  });
});

describe("canvasAssignmentSchema", () => {
  it("drops fields it doesn't list", () => {
    const parsed = canvasAssignmentSchema.parse({ ...assignment, secret_extra: "ignored" });
    expect(parsed).not.toHaveProperty("secret_extra");
  });

  it("accepts an assignment with no due date, points or submission", () => {
    const parsed = canvasAssignmentSchema.parse({
      id: 9002,
      name: "Reading 4",
      assignment_group_id: 501,
      due_at: null,
      points_possible: null,
      html_url: "https://canvas.example.edu/courses/101/assignments/9002",
    });
    expect(parsed.due_at).toBeNull();
    expect(parsed.submission_types).toEqual([]);
  });

  it("rejects a malformed due date", () => {
    expect(canvasAssignmentSchema.safeParse({ ...assignment, due_at: "next Tuesday" }).success).toBe(false);
  });

  it("rejects an assignment without an html_url", () => {
    expect(canvasAssignmentSchema.safeParse({ ...assignment, html_url: undefined }).success).toBe(false);
  });
});

describe("canvasAssignmentGroupSchema", () => {
  it("parses nested assignments", () => {
    const group = canvasAssignmentGroupSchema.parse({
      id: 501,
      name: "Problem Sets",
      position: 1,
      group_weight: 40,
      assignments: [assignment],
    });
    expect(group.assignments).toHaveLength(1);
    expect(group.assignments[0]?.submission?.score).toBe(18.5);
  });

  it("accepts an unweighted course (null weight) and a group with no assignments", () => {
    const group = canvasAssignmentGroupSchema.parse({ id: 502, name: "Exams", group_weight: null });
    expect(group.group_weight).toBeNull();
    expect(group.assignments).toEqual([]);
  });
});

describe("canvasAnnouncementSchema", () => {
  it("parses an announcement", () => {
    const parsed = canvasAnnouncementSchema.parse({
      id: 7001,
      title: "Room change",
      message: "<p>We now meet in room 2.</p>",
      posted_at: "2026-10-26T09:00:00Z",
      html_url: "https://canvas.example.edu/courses/101/discussion_topics/7001",
      user_name: "Prof. Example",
    });
    expect(parsed.title).toBe("Room change");
  });

  it("rejects an announcement without a title", () => {
    expect(
      canvasAnnouncementSchema.safeParse({
        id: 7001,
        html_url: "https://canvas.example.edu/courses/101/discussion_topics/7001",
      }).success,
    ).toBe(false);
  });
});
