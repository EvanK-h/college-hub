import { describe, expect, it } from "vitest";
import { buildCalendar, escapeText, feedSchema, foldLine, formatUtc, type Feed } from "./ics";

const now = new Date("2026-10-27T12:00:00Z");
const SESSION_ID = "11111111-1111-4111-8111-111111111111";
const ASSIGNMENT_ID = "22222222-2222-4222-8222-222222222222";

const feed: Feed = {
  sessions: [
    {
      id: SESSION_ID,
      kind: "lecture",
      starts_at: "2026-11-03T10:00:00+00:00",
      ends_at: "2026-11-03T11:40:00+00:00",
      location: "Room 1.01, Main Building",
      cancelled: false,
      course_code: "CS 2100",
      course_title: "Example Design; Part 1",
    },
  ],
  assignments: [
    { id: ASSIGNMENT_ID, title: "Problem Set 1", due_at: "2026-11-04T23:59:00+00:00", html_url: "https://canvas.example.edu/a/1", course_code: "CS 2100" },
    { id: "33333333-3333-4333-8333-333333333333", title: "Undated", due_at: null, html_url: "https://canvas.example.edu/a/2", course_code: "CS 2100" },
  ],
};

describe("buildCalendar", () => {
  const ics = buildCalendar(feed, now);
  const lines = ics.split("\r\n");

  it("is a CRLF calendar wrapped in VCALENDAR", () => {
    expect(lines[0]).toBe("BEGIN:VCALENDAR");
    expect(lines.at(-2)).toBe("END:VCALENDAR");
    expect(ics.endsWith("\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
  });

  it("writes a class with stable UID, UTC times, escaped text and status", () => {
    expect(lines).toContain(`UID:session-${SESSION_ID}@college-hub`);
    expect(lines).toContain("DTSTART:20261103T100000Z");
    expect(lines).toContain("DTEND:20261103T114000Z");
    expect(lines).toContain("SUMMARY:CS 2100 Lecture");
    expect(lines).toContain("LOCATION:Room 1.01\\, Main Building");
    expect(lines).toContain("DESCRIPTION:Example Design\\; Part 1");
    expect(lines).toContain("STATUS:CONFIRMED");
  });

  it("writes a deadline as an instant and skips undated assignments", () => {
    expect(lines).toContain(`UID:assignment-${ASSIGNMENT_ID}@college-hub`);
    expect(lines).toContain("SUMMARY:Due: Problem Set 1 (CS 2100)");
    expect(ics.match(/DTSTART:20261104T235900Z\r\nDTEND:20261104T235900Z/)).not.toBeNull();
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
  });

  it("marks a cancelled class as cancelled", () => {
    const cancelled = buildCalendar({ ...feed, sessions: [{ ...feed.sessions[0]!, cancelled: true }] }, now);
    expect(cancelled).toContain("STATUS:CANCELLED");
  });
});

describe("text helpers", () => {
  it("escapes RFC 5545 specials", () => {
    expect(escapeText("a\\b;c,d\ne")).toBe("a\\\\b\\;c\\,d\\ne");
  });

  it("formats UTC timestamps", () => {
    expect(formatUtc("2026-03-29T01:30:00+01:00")).toBe("20260329T003000Z");
  });

  it("folds long lines at 75 bytes without splitting characters", () => {
    const folded = foldLine(`SUMMARY:${"é".repeat(60)}`);
    for (const line of folded.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(folded.replace(/\r\n /g, "")).toBe(`SUMMARY:${"é".repeat(60)}`);
    expect(foldLine("SHORT:line")).toBe("SHORT:line");
  });
});

describe("feedSchema", () => {
  it("rejects a payload of the wrong shape", () => {
    expect(feedSchema.safeParse({ sessions: [{ id: "x" }], assignments: [] }).success).toBe(false);
    expect(feedSchema.safeParse(feed).success).toBe(true);
  });
});
