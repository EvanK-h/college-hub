import { describe, expect, it } from "vitest";
import { summarizeAreas, type AreaCourse } from "./areas";

const course = (id: string, status: AreaCourse["status"]): AreaCourse => ({ id, status });

describe("summarizeAreas", () => {
  it("counts each course separately, even when one requirement bundles them", () => {
    const [csRequired] = summarizeAreas([
      // Discrete Structures and its lab are one requirement but two slices of the ring.
      { area: "cs_required", courses: [course("lecture", "done"), course("lab", "in_progress")] },
      { area: "cs_required", courses: [course("other", "planned")] },
    ]);
    expect(csRequired).toEqual({ area: "cs_required", done: 1, inProgress: 1, notStarted: 1, total: 3 });
  });

  it("counts a course once when several requirements in the area share it", () => {
    const [csRequired] = summarizeAreas([
      { area: "cs_required", courses: [course("shared", "done")] },
      { area: "cs_required", courses: [course("shared", "done")] },
    ]);
    expect(csRequired.total).toBe(1);
  });

  it("puts the headline areas first and leaves out areas with no courses", () => {
    const summary = summarizeAreas([
      { area: "physics_minor", courses: [course("a", "done")] },
      { area: "cs_required", courses: [course("b", "done")] },
      { area: "writing", courses: [] },
    ]);
    expect(summary.map((area) => area.area)).toEqual(["cs_required", "physics_minor"]);
  });
});
