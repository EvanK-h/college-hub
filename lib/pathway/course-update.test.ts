import { describe, expect, it } from "vitest";
import { parseCourseUpdate } from "./course-update";

const ID = "3f2b8c1e-5a47-4d0e-9b1c-7a6d2e8f4c10";

const form = (fields: Record<string, string>) => {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return formData;
};

describe("parseCourseUpdate", () => {
  it("accepts a valid update and turns the term id into a number", () => {
    const result = parseCourseUpdate(form({ courseId: ID, status: "done", termId: "4" }));
    expect(result.success && result.data).toEqual({ courseId: ID, status: "done", termId: 4 });
  });

  it.each([
    ["an unknown status", { courseId: ID, status: "finished", termId: "4" }],
    ["a course id that is not a uuid", { courseId: "123", status: "done", termId: "4" }],
    ["a term id that is not a number", { courseId: ID, status: "done", termId: "fall" }],
    ["a negative term id", { courseId: ID, status: "done", termId: "-1" }],
    ["a fractional term id", { courseId: ID, status: "done", termId: "1.5" }],
    ["missing fields", { courseId: ID }],
  ])("rejects %s", (_name, fields) => {
    expect(parseCourseUpdate(form(fields)).success).toBe(false);
  });
});
