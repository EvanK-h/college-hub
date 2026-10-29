import { describe, expect, it } from "vitest";
import { applyPreset, checkReferences, parseFolder, totals, type RawDataset } from "./format";

// An invented, minimal folder.
const folder = {
  profile: {
    courseTypes: [{ name: "Core", color: 1 }, { name: "Co-op", color: 6, coop: true }],
    areas: [{ name: "Major", headline: true }],
    slots: ["Elective"],
    attributes: [{ code: "QR", name: "Quantitative reasoning" }],
    focuses: [{ name: "Data", goal: "STAT 4000" }],
  },
  terms: [
    { name: "Transfer", kind: "transfer" },
    { name: "Fall 1", kind: "semester" },
  ],
  courses: [
    { code: "MATH 1000", title: "Calculus", credits: 4, type: "Core", status: "done", term: "Transfer", attributes: ["QR"] },
    { code: "STAT 2000", title: "Statistics", credits: 3, type: "Core", term: "Fall 1" },
  ],
  requirements: [{ name: "Calculus", area: "Major", courses: ["MATH 1000"] }],
  swaps: [{ swapIn: "STAT 2100 · Applied statistics", slot: "Elective", replaces: ["STAT 2000"], relevance: { Data: "high" } }],
};

const parse = (files: Record<string, unknown>): RawDataset => {
  const result = parseFolder(files);
  if ("errors" in result) throw new Error(result.errors.join("\n"));
  return result.data;
};

describe("parseFolder", () => {
  it("fills defaults and treats missing optional files as empty", () => {
    const data = parse({ profile: folder.profile, terms: folder.terms, courses: folder.courses });
    expect(data.courses[1]).toMatchObject({ status: "planned", attributes: [], notes: null });
    expect(data.profile.courseTypes[0]?.coop).toBe(false);
    expect(data.requirements).toEqual([]);
    expect(data.prereqs).toEqual([]);
  });

  it("names the file and place of every problem", () => {
    const result = parseFolder({ profile: { ...folder.profile, courseTypes: [] }, terms: folder.terms, courses: [{ code: "X 1", credits: -1 }] });
    expect("errors" in result && result.errors).toEqual(
      expect.arrayContaining([
        "profile.json at .courseTypes: add at least one course type",
        expect.stringMatching(/^courses\.json at \[0\]\.credits: /),
        expect.stringMatching(/^courses\.json at \[0\]\.title: /),
      ]),
    );
  });

  it("insists on the three required files", () => {
    expect(parseFolder({})).toEqual({ errors: ["profile.json: missing", "terms.json: missing", "courses.json: missing"] });
  });
});

describe("applyPreset", () => {
  it("uses plain defaults without a preset", () => {
    const { profile } = applyPreset(parse(folder));
    expect(profile).toMatchObject({ creditUnit: "credits", timeZone: "UTC", attributeSetName: null, creditLimits: {} });
    expect(profile.gradeScale[0]).toEqual([93, "A"]);
  });

  it("brings in Northeastern's settings, NUpath and catalogue prerequisites, and lets the folder win", () => {
    const own = { course: "CS 3000", prereq: [["CS 2100"]] };
    const { profile, prereqs } = applyPreset(
      parse({ ...folder, profile: { ...folder.profile, preset: "northeastern", attributes: undefined, creditUnit: "credits" }, prereqs: [own] }),
    );
    expect(profile).toMatchObject({ school: "Northeastern University", creditUnit: "credits", attributeSetName: "NUpath", creditLimits: { semester: 18, summer: 9 } });
    expect(profile.attributes.map((attribute) => attribute.code)).toContain("WF");
    expect(prereqs.filter((entry) => entry.course === "CS 3000")).toEqual([own]);
    expect(prereqs.some((entry) => entry.course === "CS 3100")).toBe(true);
  });
});

describe("checkReferences", () => {
  it("passes a consistent folder", () => {
    expect(checkReferences(applyPreset(parse(folder)))).toEqual([]);
  });

  it("reports names that aren't defined and things listed twice", () => {
    const broken = parse({
      ...folder,
      courses: [...folder.courses, { code: "STAT 2000", title: "Again", credits: 3, type: "Elective", term: "Spring 9", attributes: ["ZZ"] }],
      swaps: [{ swapIn: "X", slot: "Nope", replaces: ["CS 9999"], relevance: { Robots: "low" } }],
    });
    expect(checkReferences(applyPreset(broken))).toEqual([
      'courses.json: course "STAT 2000" is listed twice',
      'courses.json: STAT 2000 names the type "Elective", which isn\'t defined',
      'courses.json: STAT 2000 names the term "Spring 9", which isn\'t defined',
      'courses.json: STAT 2000 names the attribute "ZZ", which isn\'t defined',
      'swaps.json: X names the slot "Nope", which isn\'t defined',
      'swaps.json: X names the course "CS 9999", which isn\'t defined',
      'swaps.json: X names the focus "Robots", which isn\'t defined',
    ]);
  });
});

describe("totals", () => {
  it("adds up courses and credits, and transfer credit by term kind", () => {
    expect(totals(applyPreset(parse(folder)))).toEqual({ courses: 2, credits: 7, transferCredits: 4, requirements: 1, swaps: 1 });
  });
});
