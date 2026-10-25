import { describe, expect, it } from "vitest";
import { summarizeAreas } from "./areas";

describe("summarizeAreas", () => {
  const summary = summarizeAreas([
    { area: "physics_minor", status: "done" },
    { area: "cs_required", status: "done" },
    { area: "cs_required", status: "in_progress" },
    { area: "cs_required", status: "planned" },
    { area: "cs_required", status: null },
  ]);

  it("counts requirements by status, treating anything else as not started", () => {
    expect(summary.find((area) => area.area === "cs_required")).toEqual({
      area: "cs_required",
      done: 1,
      inProgress: 1,
      notStarted: 2,
      total: 4,
    });
  });

  it("puts the headline areas first and leaves out empty areas", () => {
    expect(summary.map((area) => area.area)).toEqual(["cs_required", "physics_minor"]);
  });
});
