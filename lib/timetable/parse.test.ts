import { describe, expect, it } from "vitest";
import { guessSessionType } from "./kind";
import { parseTimetable } from "./parse";

// An invented feed shaped like Outlook's: Windows time-zone names, CRLF line endings.
const TIMEZONE = [
  "BEGIN:VTIMEZONE",
  "TZID:GMT Standard Time",
  "BEGIN:STANDARD",
  "DTSTART:16010101T020000",
  "TZOFFSETFROM:+0100",
  "TZOFFSETTO:+0000",
  "RRULE:FREQ=YEARLY;INTERVAL=1;BYDAY=-1SU;BYMONTH=10",
  "END:STANDARD",
  "BEGIN:DAYLIGHT",
  "DTSTART:16010101T010000",
  "TZOFFSETFROM:+0000",
  "TZOFFSETTO:+0100",
  "RRULE:FREQ=YEARLY;INTERVAL=1;BYDAY=-1SU;BYMONTH=3",
  "END:DAYLIGHT",
  "END:VTIMEZONE",
];

function feed(...events: string[][]): string {
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Test//EN", ...TIMEZONE, ...events.flat(), "END:VCALENDAR", ""].join("\r\n");
}

function event(lines: string[]): string[] {
  return ["BEGIN:VEVENT", "DTSTAMP:20261001T000000Z", ...lines, "END:VEVENT"];
}

// Weekly on Tuesdays at 10:00 London time for six weeks, across the clock change on 25 October.
// 3 November is skipped; 10 November is moved to Thursday 12 November at 14:00.
const lecture = event([
  "UID:lecture-1",
  "SUMMARY:CS 2100 Lecture",
  "LOCATION:Room 101",
  "DTSTART;TZID=GMT Standard Time:20261020T100000",
  "DTEND;TZID=GMT Standard Time:20261020T114000",
  "RRULE:FREQ=WEEKLY;COUNT=6;BYDAY=TU",
  "EXDATE;TZID=GMT Standard Time:20261103T100000",
]);
const movedLecture = event([
  "UID:lecture-1",
  "RECURRENCE-ID;TZID=GMT Standard Time:20261110T100000",
  "SUMMARY:CS 2100 Lecture",
  "LOCATION:Room 204",
  "DTSTART;TZID=GMT Standard Time:20261112T140000",
  "DTEND;TZID=GMT Standard Time:20261112T154000",
]);
const lab = event([
  "UID:lab-1",
  "SUMMARY:PHYS1151 Laboratory",
  "DESCRIPTION:Bring your lab notebook",
  "DTSTART:20261021T130000Z",
  "DTEND:20261021T150000Z",
]);
const cancelled = event([
  "UID:seminar-1",
  "SUMMARY:Canceled: CS 2101 Seminar",
  "STATUS:CANCELLED",
  "DTSTART:20261022T090000Z",
  "DTEND:20261022T100000Z",
]);
const notAClass = event(["UID:other-1", "SUMMARY:Dentist", "DTSTART:20261023T090000Z", "DTEND:20261023T100000Z"]);
const allDay = event([
  "UID:holiday-1",
  "SUMMARY:CS 2100 Reading week",
  "DTSTART;VALUE=DATE:20261026",
  "DTEND;VALUE=DATE:20261031",
]);

const window = { from: new Date("2026-10-01T00:00:00Z"), to: new Date("2027-01-01T00:00:00Z") };

describe("parseTimetable", () => {
  const sessions = parseTimetable(feed(lecture, movedLecture, lab, cancelled, notAClass, allDay), window);
  const lectures = sessions.filter((session) => session.icsUid === "lecture-1");

  it("expands a weekly class, skipping excluded dates", () => {
    expect(lectures.map((session) => session.recurrenceId?.toISOString())).toEqual([
      "2026-10-20T09:00:00.000Z", // 10:00 BST
      "2026-10-27T10:00:00.000Z", // 10:00 GMT, after the clock change
      "2026-11-10T10:00:00.000Z", // the moved one keeps its original start as its identity...
      "2026-11-17T10:00:00.000Z",
      "2026-11-24T10:00:00.000Z",
    ]);
  });

  it("gives a moved occurrence its new time and room", () => {
    const moved = lectures.find((session) => session.recurrenceId?.toISOString() === "2026-11-10T10:00:00.000Z");
    expect(moved).toMatchObject({
      startsAt: new Date("2026-11-12T14:00:00Z"), // ...and its new time
      endsAt: new Date("2026-11-12T15:40:00Z"),
      location: "Room 204",
      cancelled: false,
    });
  });

  it("maps title, course code, type and room", () => {
    expect(lectures[0]).toMatchObject({
      courseCode: "CS 2100",
      title: "CS 2100 Lecture",
      kind: "lecture",
      location: "Room 101",
      startsAt: new Date("2026-10-20T09:00:00Z"),
      endsAt: new Date("2026-10-20T10:40:00Z"),
    });
  });

  it("normalises a code written without a space", () => {
    expect(sessions.find((session) => session.icsUid === "lab-1")).toMatchObject({
      courseCode: "PHYS 1151",
      kind: "lab",
      location: null,
      recurrenceId: null, // a one-off event: its UID alone identifies it
    });
  });

  it("guesses the type from the words after the code", () => {
    const test = event(["UID:t", "SUMMARY:TEST 1000 Lecture", "DTSTART:20261020T100000Z", "DTEND:20261020T110000Z"]);
    expect(parseTimetable(feed(test), window)[0]).toMatchObject({ courseCode: "TEST 1000", kind: "lecture" });
  });

  it("keeps a cancelled class, flagged, without Outlook's prefix", () => {
    expect(sessions.find((session) => session.icsUid === "seminar-1")).toMatchObject({
      courseCode: "CS 2101",
      title: "CS 2101 Seminar",
      kind: "seminar",
      cancelled: true,
    });
  });

  it("leaves out events that are not classes, and all-day events", () => {
    expect(sessions.map((session) => session.icsUid)).not.toContain("other-1");
    expect(sessions.map((session) => session.icsUid)).not.toContain("holiday-1");
  });

  it("returns sessions in start order", () => {
    const starts = sessions.map((session) => session.startsAt.getTime());
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });

  it("only returns occurrences inside the window", () => {
    const narrow = parseTimetable(feed(lecture), {
      from: new Date("2026-11-15T00:00:00Z"),
      to: new Date("2026-11-30T00:00:00Z"),
    });
    expect(narrow).toHaveLength(2);
  });

  it("refuses text that is not a calendar", () => {
    expect(() => parseTimetable("<!doctype html><title>Sign in</title>", window)).toThrow(/not an ICS calendar/);
  });

  it("refuses an event that ends before it starts", () => {
    const broken = event(["UID:bad", "SUMMARY:CS 2100 Lecture", "DTSTART:20261020T100000Z", "DTEND:20261020T090000Z"]);
    expect(() => parseTimetable(feed(broken), window)).toThrow();
  });
});

describe("guessSessionType", () => {
  it.each([
    ["CS 2100 Lecture", "", "lecture"],
    ["PHYS 1151 Lab", "", "lab"],
    ["PHYS 1151 Practical", "", "lab"],
    ["CS 2100 Lab exam", "", "exam"],
    ["MATH 2321 Midterm", "", "exam"],
    ["CS 2101 Seminar", "", "seminar"],
    ["CS 2101 Tutorial", "", "tutorial"],
    ["CS 2101 Workshop", "", "workshop"],
    ["CS 2100", "Weekly tutorial, group B", "tutorial"],
    ["CS 2100", "", "other"],
  ] as const)("%s / %s → %s", (title, description, expected) => {
    expect(guessSessionType(title, description)).toBe(expected);
  });
});
