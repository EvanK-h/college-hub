import { describe, expect, it } from "vitest";
import { parseAnnouncementFlag, parseAssignmentProgress, parseCourseNotes } from "./forms";

const ID = "3f2b8c1e-5a47-4d0e-9b1c-7a6d2e8f4c10";

const form = (fields: Record<string, string>) => {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return formData;
};

describe("parseCourseNotes", () => {
  it("trims notes, and turns an empty box into null", () => {
    expect(parseCourseNotes(form({ courseId: ID, notes: "  Office hours Tue 2pm \n" })).data).toEqual({
      courseId: ID,
      notes: "Office hours Tue 2pm",
    });
    expect(parseCourseNotes(form({ courseId: ID, notes: "   " })).data).toEqual({ courseId: ID, notes: null });
  });

  it("rejects a bad course id or notes that are too long", () => {
    expect(parseCourseNotes(form({ courseId: "CS 2100", notes: "x" })).success).toBe(false);
    expect(parseCourseNotes(form({ courseId: ID, notes: "x".repeat(10_001) })).success).toBe(false);
  });
});

describe("parseAnnouncementFlag", () => {
  it("accepts read and important, with a boolean value", () => {
    expect(parseAnnouncementFlag(form({ announcementId: ID, flag: "important", value: "true" })).data).toEqual({
      announcementId: ID,
      flag: "important",
      value: true,
    });
  });

  it("rejects any other column, so the form can't write a synced field", () => {
    expect(parseAnnouncementFlag(form({ announcementId: ID, flag: "title", value: "true" })).success).toBe(false);
    expect(parseAnnouncementFlag(form({ announcementId: ID, flag: "read", value: "1" })).success).toBe(false);
  });
});

describe("parseAssignmentProgress", () => {
  it("accepts your two progress values", () => {
    expect(parseAssignmentProgress(form({ assignmentId: ID, progress: "in_progress" })).success).toBe(true);
  });

  it("rejects Canvas's states, which are not yours to set", () => {
    expect(parseAssignmentProgress(form({ assignmentId: ID, progress: "submitted" })).success).toBe(false);
  });
});
