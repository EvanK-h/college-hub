import { describe, expect, it } from "vitest";
import { ringCaption, summarizeAreas, type AreaCourse } from "./areas";

const course = (id: string, status: AreaCourse["status"]): AreaCourse => ({ id, status });
const required = { id: "required", name: "Required", headline: true };
const minor = { id: "minor", name: "Minor", headline: true };
const writing = { id: "writing", name: "Writing", headline: false };

describe("summarizeAreas", () => {
  it("counts each course separately, even when one requirement bundles them", () => {
    const [summary] = summarizeAreas(
      [required],
      [
        // A lecture and its lab are one requirement but two slices of the ring.
        { areaId: "required", courses: [course("lecture", "done"), course("lab", "in_progress")] },
        { areaId: "required", courses: [course("other", "planned")] },
      ],
    );
    expect(summary).toEqual({ area: required, done: 1, inProgress: 1, notStarted: 1, total: 3 });
  });

  it("counts a course once when several requirements in the area share it", () => {
    const [summary] = summarizeAreas(
      [required],
      [
        { areaId: "required", courses: [course("shared", "done")] },
        { areaId: "required", courses: [course("shared", "done")] },
      ],
    );
    expect(summary.total).toBe(1);
  });

  it("follows the order of the areas and leaves out areas with no courses", () => {
    const summary = summarizeAreas(
      [required, minor, writing],
      [
        { areaId: "minor", courses: [course("a", "done")] },
        { areaId: "required", courses: [course("b", "done")] },
        { areaId: "writing", courses: [] },
      ],
    );
    expect(summary.map(({ area }) => area.id)).toEqual(["required", "minor"]);
  });
});

describe("ringCaption", () => {
  const counts = (done: number, inProgress: number, notStarted: number) => ({ done, inProgress, notStarted, total: done + inProgress + notStarted });

  it("says what's left", () => {
    expect(ringCaption(counts(0, 0, 9))).toBe("9 to go");
    expect(ringCaption(counts(3, 1, 1))).toBe("1 in progress · 1 to go");
    expect(ringCaption(counts(3, 2, 0))).toBe("2 in progress");
  });

  it("says complete when everything is done", () => {
    expect(ringCaption(counts(4, 0, 0))).toBe("Complete");
  });
});
