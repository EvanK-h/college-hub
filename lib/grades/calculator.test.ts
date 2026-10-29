import { describe, expect, it } from "vitest";
import { courseGrade, gradeContributions, groupGrades, letterGrade, namesItsWeight, neededForTarget, type GradeGroup, type GradeItem } from "./calculator";

// A weighted course: homework 40%, exams 60%. All numbers are invented and worked by hand.
const weightedGroups: GradeGroup[] = [
  { id: 1, name: "Homework", weight: 40 },
  { id: 2, name: "Exams", weight: 60 },
];
const graded = (groupId: number, score: number, pointsPossible: number): GradeItem => ({ groupId, score, pointsPossible });
const ungraded = (groupId: number, pointsPossible: number): GradeItem => ({ groupId, score: null, pointsPossible });

describe("courseGrade", () => {
  it("combines group percentages by weight", () => {
    // Homework 18/20 = 90%, exams 70/100 = 70% → 0.4 × 90 + 0.6 × 70 = 78.
    const grade = courseGrade(weightedGroups, [graded(1, 18, 20), graded(2, 70, 100)]);
    expect(grade.weighted).toBe(true);
    expect(grade.percent).toBeCloseTo(78);
  });

  it("ignores ungraded work in the current grade", () => {
    const grade = courseGrade(weightedGroups, [graded(1, 18, 20), graded(2, 70, 100), ungraded(2, 100)]);
    expect(grade.percent).toBeCloseTo(78);
  });

  it("leaves out a group with nothing graded and scales the rest up", () => {
    // Only homework is graded: 90% of the 40% in play is 90%, as Canvas shows it.
    const grade = courseGrade(weightedGroups, [graded(1, 18, 20), ungraded(2, 100)]);
    expect(grade.percent).toBeCloseTo(90);
  });

  it("uses total points when no group is weighted", () => {
    const groups: GradeGroup[] = [
      { id: 1, name: "Homework", weight: null },
      { id: 2, name: "Exams", weight: 0 },
    ];
    // (18 + 70) / (20 + 100) = 73.33…%; the bigger exam counts for more.
    const grade = courseGrade(groups, [graded(1, 18, 20), graded(2, 70, 100)]);
    expect(grade.weighted).toBe(false);
    expect(grade.percent).toBeCloseTo(73.333, 2);
  });

  it("is null before anything is graded", () => {
    expect(courseGrade(weightedGroups, [ungraded(1, 20)]).percent).toBeNull();
    expect(courseGrade(weightedGroups, []).percent).toBeNull();
  });

  it("skips items worth no points, and counts extra credit above 100%", () => {
    const grade = courseGrade(weightedGroups, [graded(1, 22, 20), graded(1, 5, 0), { groupId: 1, score: 3, pointsPossible: null }]);
    expect(grade.percent).toBeCloseTo(110);
  });
});

describe("groupGrades", () => {
  it("reports earned, graded and remaining points per group", () => {
    const groups = groupGrades(weightedGroups, [graded(1, 18, 20), ungraded(1, 20), ungraded(2, 100)]);
    expect(groups).toEqual([
      { id: 1, name: "Homework", weight: 40, earned: 18, graded: 20, remaining: 20, percent: 90 },
      { id: 2, name: "Exams", weight: 60, earned: 0, graded: 0, remaining: 100, percent: null },
    ]);
  });
});

describe("neededForTarget", () => {
  // Homework 18/20 graded; the 100-point final is still to come.
  // Final grade = 0.4 × 90 + 0.6 × x = 36 + 0.6x, where x is the final's percentage.
  const items = [graded(1, 18, 20), ungraded(2, 100)];

  it("solves for the average needed on the remaining work", () => {
    // 36 + 0.6x = 90 → x = 90.
    const outcome = neededForTarget(weightedGroups, items, 90);
    expect(outcome.kind).toBe("needed");
    expect(outcome.kind === "needed" && outcome.percent).toBeCloseTo(90);
  });

  it("says when the target is out of reach, and what the best is", () => {
    // Full marks give 36 + 60 = 96.
    expect(neededForTarget(weightedGroups, items, 97)).toEqual({ kind: "out_of_reach", bestPercent: 96 });
  });

  it("says when the target is already secured", () => {
    // Zero on the final still gives 36.
    expect(neededForTarget(weightedGroups, items, 30)).toEqual({ kind: "secured" });
  });

  it("mixes graded and remaining work inside a group", () => {
    // Homework: 18/20 graded + 20 to come; exams 70/100 graded + 100 to come.
    // Final = 0.4 × (18 + 20x)/40 + 0.6 × (70 + 100x)/200 = 0.18 + 0.2x + 0.21 + 0.3x = 39 + 50x (in %).
    // For 80: x = 0.82.
    const outcome = neededForTarget(weightedGroups, [graded(1, 18, 20), ungraded(1, 20), graded(2, 70, 100), ungraded(2, 100)], 80);
    expect(outcome.kind === "needed" && outcome.percent).toBeCloseTo(82);
  });

  it("works on total points too", () => {
    const groups: GradeGroup[] = [{ id: 1, name: "All", weight: null }];
    // (40 + 60x) / 100 ≥ 0.7 → x = 0.5.
    const outcome = neededForTarget(groups, [graded(1, 40, 40), ungraded(1, 60)], 70);
    expect(outcome.kind === "needed" && outcome.percent).toBeCloseTo(50);
  });

  it("reports the final grade when nothing is left to grade", () => {
    expect(neededForTarget(weightedGroups, [graded(1, 18, 20), graded(2, 70, 100)], 90)).toMatchObject({
      kind: "no_remaining_work",
      percent: expect.closeTo(78),
    });
  });

  it("ignores remaining work in a group worth 0% of a weighted course", () => {
    const groups: GradeGroup[] = [...weightedGroups, { id: 3, name: "Practice", weight: 0 }];
    expect(neededForTarget(groups, [graded(1, 18, 20), graded(2, 70, 100), ungraded(3, 10)], 90).kind).toBe("no_remaining_work");
  });
});

describe("letterGrade", () => {
  it.each([
    [100, "A"],
    [93, "A"],
    [92.99, "A−"],
    [90, "A−"],
    [87, "B+"],
    [83, "B"],
    [80, "B−"],
    [77, "C+"],
    [73, "C"],
    [70, "C−"],
    [67, "D+"],
    [63, "D"],
    [60, "D−"],
    [59.99, "F"],
    [0, "F"],
  ])("%d → %s", (percent, letter) => {
    expect(letterGrade(percent)).toBe(letter);
  });
});

describe("namesItsWeight", () => {
  it.each([
    ["Set Exercises 1 (25%)", true],
    ["AE4 - Project (20 %)", true],
    ["Exams (12.5%)", true],
    ["Homework", false],
    ["25% of the grade", false],
  ])("%s → %s", (name, expected) => {
    expect(namesItsWeight(name)).toBe(expected);
  });
});

describe("gradeContributions", () => {
  it("splits a weighted grade by weight, and the points add up to the grade", () => {
    // Homework 90% of a 40% share adds 36; exams 70% of 60% add 42; 36 + 42 = 78.
    const parts = gradeContributions(courseGrade(weightedGroups, [graded(1, 18, 20), graded(2, 70, 100)]));
    expect(parts.map(({ name, share, points }) => [name, share, points])).toEqual([
      ["Homework", 40, 36],
      ["Exams", 60, 42],
    ]);
  });

  it("leaves out groups with nothing graded, scaling the rest up to 100", () => {
    const parts = gradeContributions(courseGrade(weightedGroups, [graded(1, 18, 20), ungraded(2, 100)]));
    expect(parts).toEqual([{ id: 1, name: "Homework", share: 100, points: 90 }]);
  });

  it("splits a points course by graded points", () => {
    const groups: GradeGroup[] = [
      { id: 1, name: "Homework", weight: null },
      { id: 2, name: "Exams", weight: null },
    ];
    const parts = gradeContributions(courseGrade(groups, [graded(1, 18, 20), graded(2, 70, 80)]));
    // 20 of 100 graded points are homework (18 earned), 80 are exams (70 earned).
    expect(parts.map((part) => [part.share, part.points])).toEqual([
      [20, 18],
      [80, 70],
    ]);
  });

  it("is empty before anything is graded", () => {
    expect(gradeContributions(courseGrade(weightedGroups, []))).toEqual([]);
  });
});
