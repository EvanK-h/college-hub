import { describe, expect, it } from "vitest";
import { neighbours, parseCalendarParams, shiftMonth, startOfWeek, viewRange } from "./params";

const today = "2026-10-27";

describe("parseCalendarParams", () => {
  it("defaults to this month", () => {
    expect(parseCalendarParams({}, today)).toEqual({ view: "month", date: today });
  });

  it("reads a valid view and date", () => {
    expect(parseCalendarParams({ view: "week", date: "2026-11-03" }, today)).toEqual({ view: "week", date: "2026-11-03" });
  });

  it("falls back instead of failing on bad input", () => {
    expect(parseCalendarParams({ view: "year", date: "2026-02-30" }, today)).toEqual({ view: "month", date: today });
    expect(parseCalendarParams({ date: "<script>" }, today)).toEqual({ view: "month", date: today });
  });

  it("takes the first of repeated parameters", () => {
    expect(parseCalendarParams({ view: ["week", "month"] }, today).view).toBe("week");
  });
});

describe("date maths", () => {
  it("finds the Monday of a week", () => {
    expect(startOfWeek("2026-10-27")).toBe("2026-10-26"); // Tuesday → Monday
    expect(startOfWeek("2026-10-26")).toBe("2026-10-26");
    expect(startOfWeek("2026-11-01")).toBe("2026-10-26"); // Sunday belongs to the week before
  });

  it("moves between months, across a year end", () => {
    expect(shiftMonth("2026-10-27", 1)).toBe("2026-11-01");
    expect(shiftMonth("2026-12-15", 1)).toBe("2027-01-01");
    expect(shiftMonth("2026-01-31", -1)).toBe("2025-12-01");
  });

  it("gives each view's range", () => {
    expect(viewRange("week", "2026-10-29")).toEqual({ first: "2026-10-26", last: "2026-11-01" });
    expect(viewRange("month", "2026-02-10")).toEqual({ first: "2026-02-01", last: "2026-02-28" });
  });

  it("gives the previous and next pages", () => {
    expect(neighbours("week", "2026-10-29")).toEqual({ previous: "2026-10-19", next: "2026-11-02" });
    expect(neighbours("month", "2026-10-29")).toEqual({ previous: "2026-09-01", next: "2026-11-01" });
  });
});
