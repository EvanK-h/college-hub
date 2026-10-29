import { describe, expect, it } from "vitest";
import { summarizeAttributes } from "./attributes";

const attribute = (code: string, required = true) => ({ id: code, code, name: code, required });
const attributes = ["ND", "AD", "FQ", "IC", "WF"].map((code) => attribute(code));

describe("summarizeAttributes", () => {
  it("covers an attribute only when a completed course carries it", () => {
    const summary = summarizeAttributes(attributes, [
      { attributeIds: ["ND", "AD"], status: "done" },
      { attributeIds: ["FQ"], status: "in_progress" },
      { attributeIds: ["IC"], status: "planned" },
    ]);
    expect(summary).toMatchObject({ done: 2, inProgress: 1, notStarted: 2, total: 5 });
  });

  it("uses the furthest-along course when several carry the same attribute", () => {
    const summary = summarizeAttributes(attributes, [
      { attributeIds: ["ND"], status: "planned" },
      { attributeIds: ["ND"], status: "done" },
      { attributeIds: ["ND"], status: "in_progress" },
    ]);
    expect(summary.codes.find((entry) => entry.code === "ND")?.state).toBe("done");
  });

  it("leaves out attributes that aren't required", () => {
    const summary = summarizeAttributes([...attributes, attribute("XX", false)], [{ attributeIds: ["XX"], status: "done" }]);
    expect(summary.total).toBe(5);
    expect(summary.done).toBe(0);
  });

  it("reports every attribute as not started when there are no courses", () => {
    expect(summarizeAttributes(attributes, []).notStarted).toBe(5);
  });
});
