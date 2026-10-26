import { describe, expect, it } from "vitest";
import { guessKind } from "./kind";

describe("guessKind", () => {
  it("calls an online quiz a quiz", () => {
    expect(guessKind(["online_quiz"], "Week 3 Check-in")).toBe("quiz");
  });

  it("calls a quiz by its title even when it is submitted another way", () => {
    expect(guessKind(["online_upload"], "Quiz 2")).toBe("quiz");
  });

  it("calls an exam an exam even when Canvas delivers it as an online quiz", () => {
    expect(guessKind(["online_quiz"], "Midterm Exam")).toBe("exam");
    expect(guessKind(["online_quiz"], "Final Exam")).toBe("exam");
    expect(guessKind(["none"], "Midterm")).toBe("exam");
  });

  it("does not treat a final project as an exam", () => {
    expect(guessKind(["online_upload"], "Final Project Report")).toBe("assignment");
  });

  it("calls a discussion topic a discussion", () => {
    expect(guessKind(["discussion_topic"], "Week 4 Reflection")).toBe("discussion");
  });

  it("calls a lab a lab", () => {
    expect(guessKind(["online_upload"], "Lab 5: Pointers")).toBe("lab");
  });

  it("calls a lab quiz a quiz", () => {
    expect(guessKind(["online_quiz"], "Lab Quiz 1")).toBe("quiz");
  });

  it("calls a reading with nothing to hand in a reading", () => {
    expect(guessKind(["none"], "Reading 4: Chapters 7-8")).toBe("reading");
    expect(guessKind([], "Read chapter 3")).toBe("reading");
  });

  it("does not call a reading response that must be submitted a reading", () => {
    expect(guessKind(["online_text_entry"], "Reading Response 2")).toBe("assignment");
  });

  it("defaults to assignment", () => {
    expect(guessKind(["online_upload"], "Problem Set 3")).toBe("assignment");
    expect(guessKind([], "Homework 1")).toBe("assignment");
  });

  it("does not match keywords inside other words", () => {
    expect(guessKind(["online_upload"], "Quizzical Essay on Labour")).toBe("assignment");
    expect(guessKind(["online_upload"], "Already Done")).toBe("assignment");
  });
});
