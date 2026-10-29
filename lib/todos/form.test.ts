import { describe, expect, it } from "vitest";
import { parseNewTodo, parseRestoredTodo, parseTodoId, parseTodoToggle } from "./form";

const ID = "3f2b8c1e-5a47-4d0e-9b1c-7a6d2e8f4c10";

const form = (fields: Record<string, string>) => {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return formData;
};

describe("parseNewTodo", () => {
  it("accepts a full to-do and trims the title", () => {
    const result = parseNewTodo(form({ title: "  Revise chapter 3 ", courseId: ID, dueOn: "2026-11-02" }));
    expect(result.success && result.data).toEqual({ title: "Revise chapter 3", courseId: ID, dueOn: "2026-11-02" });
  });

  it("treats an empty course and date as none", () => {
    const result = parseNewTodo(form({ title: "Buy a lab coat", courseId: "", dueOn: "" }));
    expect(result.success && result.data).toEqual({ title: "Buy a lab coat", courseId: null, dueOn: null });
  });

  it("accepts a form without the optional fields", () => {
    expect(parseNewTodo(form({ title: "Email the advisor" })).success).toBe(true);
  });

  it.each([
    ["an empty title", { title: "   " }],
    ["a missing title", {}],
    ["a very long title", { title: "x".repeat(201) }],
    ["a course id that is not a uuid", { title: "x", courseId: "CS 2100" }],
    ["a date that is not a date", { title: "x", dueOn: "next week" }],
    ["an impossible date", { title: "x", dueOn: "2026-02-30" }],
  ])("rejects %s", (_name, fields) => {
    expect(parseNewTodo(form(fields)).success).toBe(false);
  });
});

describe("parseTodoToggle", () => {
  it("turns the done flag into a boolean", () => {
    expect(parseTodoToggle(form({ todoId: ID, done: "true" })).data).toEqual({ todoId: ID, done: true });
    expect(parseTodoToggle(form({ todoId: ID, done: "false" })).data).toEqual({ todoId: ID, done: false });
  });

  it("rejects anything else", () => {
    expect(parseTodoToggle(form({ todoId: ID, done: "yes" })).success).toBe(false);
    expect(parseTodoToggle(form({ todoId: "1", done: "true" })).success).toBe(false);
  });
});

describe("parseTodoId", () => {
  it("accepts only a uuid", () => {
    expect(parseTodoId(form({ todoId: ID })).success).toBe(true);
    expect(parseTodoId(form({ todoId: "1" })).success).toBe(false);
    expect(parseTodoId(form({})).success).toBe(false);
  });
});

describe("parseRestoredTodo", () => {
  const row = { id: ID, title: "Revise chapter 3", course_id: null, due_on: "2026-11-02", created_at: "2026-10-29T14:03:11.123456+00:00" };

  it("accepts a deleted row as the database returned it", () => {
    expect(parseRestoredTodo(row).success).toBe(true);
  });

  it("rejects a row that isn't a to-do", () => {
    expect(parseRestoredTodo({ ...row, id: "nope" }).success).toBe(false);
    expect(parseRestoredTodo({ ...row, title: "" }).success).toBe(false);
    expect(parseRestoredTodo({ ...row, due_on: "soon" }).success).toBe(false);
    expect(parseRestoredTodo("a string").success).toBe(false);
  });
});
