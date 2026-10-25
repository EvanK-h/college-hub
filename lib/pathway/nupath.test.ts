import { describe, expect, it } from "vitest";
import { REQUIRED_NUPATH, summarizeNupath } from "./nupath";

describe("summarizeNupath", () => {
  it("covers a code only when a completed course carries it", () => {
    const summary = summarizeNupath([
      { nupath: ["ND", "AD"], status: "done" },
      { nupath: ["FQ"], status: "in_progress" },
      { nupath: ["IC"], status: "planned" },
    ]);
    expect(summary.done).toBe(2);
    expect(summary.inProgress).toBe(1);
    expect(summary.notStarted).toBe(REQUIRED_NUPATH.length - 3);
    expect(summary.total).toBe(REQUIRED_NUPATH.length);
  });

  it("uses the furthest-along course when several carry the same code", () => {
    const summary = summarizeNupath([
      { nupath: ["ND"], status: "planned" },
      { nupath: ["ND"], status: "done" },
      { nupath: ["ND"], status: "in_progress" },
    ]);
    expect(summary.codes.find((entry) => entry.code === "ND")?.state).toBe("done");
  });

  it("reports every code as not started when there are no courses", () => {
    expect(summarizeNupath([]).notStarted).toBe(REQUIRED_NUPATH.length);
  });
});
