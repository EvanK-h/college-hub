import { describe, expect, it } from "vitest";
import { dayKey, formatDay, formatTimeRange } from "./format";

describe("timetable formatting", () => {
  it("shows a London class in local time on both sides of the clock change", () => {
    // 09:00 UTC in BST is 10:00; 10:00 UTC in GMT is 10:00.
    expect(formatTimeRange(new Date("2026-10-20T09:00:00Z"), new Date("2026-10-20T10:40:00Z"), "Europe/London")).toBe("10:00 – 11:40");
    expect(formatTimeRange(new Date("2026-10-27T10:00:00Z"), new Date("2026-10-27T11:40:00Z"), "Europe/London")).toBe("10:00 – 11:40");
  });

  it("names the day in the term's zone, not UTC", () => {
    // 03:30 UTC on Wednesday is still Tuesday evening in Boston.
    const late = new Date("2027-09-08T03:30:00Z");
    expect(formatDay(late, "America/New_York")).toBe("Tue 7 Sept");
    expect(dayKey(late, "America/New_York")).toBe("2027-09-07");
    expect(dayKey(late, "Europe/London")).toBe("2027-09-08");
  });
});
