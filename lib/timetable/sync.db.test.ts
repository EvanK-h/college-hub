import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "@/lib/database.types";
import { readLocalSupabase, testCourseType } from "@/test/local-supabase";
import { syncTimetable } from "./sync";

// These tests run the real sync_class_sessions function, so they need the local Supabase stack
// (`supabase start`); see test/local-supabase.ts.
const local = readLocalSupabase();

// All data is invented. The owner and term differ from the Canvas DB test's, since the two files
// run in parallel.
const OWNER = "33333333-3333-4333-8333-333333333333";
const OTHER_OWNER = "44444444-4444-4444-8444-444444444444";
const TERM_ID = 30002;
const NOW = new Date("2026-10-27T12:00:00Z");

type FeedEvent = { uid: string; summary: string; start: string; end: string; location?: string; status?: string };

const ics = (events: FeedEvent[]) =>
  [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    ...events.flatMap((event) => [
      "BEGIN:VEVENT",
      `UID:${event.uid}`,
      "DTSTAMP:20261001T000000Z",
      `SUMMARY:${event.summary}`,
      `DTSTART:${event.start}`,
      `DTEND:${event.end}`,
      ...(event.location ? [`LOCATION:${event.location}`] : []),
      ...(event.status ? [`STATUS:${event.status}`] : []),
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ].join("\r\n");

const pastLecture: FeedEvent = { uid: "past", summary: "TEST 1000 Lecture", start: "20261020T100000Z", end: "20261020T114000Z" };
const lecture: FeedEvent = {
  uid: "lecture",
  summary: "TEST 1000 Lecture",
  start: "20261103T100000Z",
  end: "20261103T114000Z",
  location: "Room 101",
};
const lab: FeedEvent = { uid: "lab", summary: "TEST 2000 Lab", start: "20261104T130000Z", end: "20261104T150000Z" };
const unknownCourse: FeedEvent = { uid: "other", summary: "ZZZ 9999 Lecture", start: "20261105T090000Z", end: "20261105T100000Z" };
const workshop: FeedEvent = { uid: "workshop", summary: "Workshop; Optional class/workshop", start: "20261106T140000Z", end: "20261106T150000Z" };

describe.skipIf(!local)("timetable sync against the local database", () => {
  // The placeholders are never used: the suite is skipped when `local` is null.
  const db = createClient<Database>(local?.url ?? "http://127.0.0.1", local?.serviceKey ?? "unused", {
    auth: { persistSession: false },
  });
  let feed: string;

  const check = ({ error }: { error: { message: string } | null }) => {
    if (error) throw new Error(error.message);
  };

  async function cleanUp() {
    // Sessions go first and by owner: those without a course aren't reached by the courses' cascade.
    check(await db.from("class_sessions").delete().eq("owner_id", OWNER));
    check(await db.from("sync_runs").delete().eq("owner_id", OWNER));
    check(await db.from("courses").delete().eq("owner_id", OWNER));
  }

  async function runSync() {
    const outcome = await syncTimetable({ db, fetchFeed: async () => feed, ownerId: OWNER, now: NOW });
    if (outcome.status === "skipped") throw new Error(`sync was skipped: ${outcome.reason}`);
    return outcome;
  }

  async function sessionRow(uid: string) {
    const { data, error } = await db.from("class_sessions").select("*").eq("owner_id", OWNER).eq("ics_uid", uid).single();
    if (error) throw new Error(error.message);
    return data;
  }

  async function sessionCount() {
    const { count } = await db.from("class_sessions").select("id", { count: "exact", head: true }).eq("owner_id", OWNER);
    return count;
  }

  beforeAll(async () => {
    await cleanUp();
    check(await db.from("terms").upsert({ id: TERM_ID, name: "Test term (timetable db tests)", kind: "semester", owner_id: OWNER }));
  });

  beforeEach(async () => {
    await cleanUp();
    const type = await testCourseType(db, OWNER);
    check(
      await db.from("courses").insert([
        { code: "TEST 1000", title: "Test One", credits: 4, course_type_id: type, term_id: TERM_ID, owner_id: OWNER },
        { code: "TEST 2000", title: "Test Two", credits: 4, course_type_id: type, term_id: TERM_ID, owner_id: OWNER },
      ]),
    );
    feed = ics([pastLecture, lecture, lab, unknownCourse, workshop]);
  });

  afterAll(async () => {
    await cleanUp();
    check(await db.from("terms").delete().eq("id", TERM_ID));
  });

  it("inserts every event, linking classes to the courses in your plan, and records the run", async () => {
    const result = await runSync();

    expect(result).toMatchObject({ status: "success", error: null, counts: { inserted: 5, updated: 0, unchanged: 0 } });
    expect(await sessionRow("lecture")).toMatchObject({ kind: "lecture", location: "Room 101", cancelled: false, is_new: true });
    expect((await sessionRow("lecture")).course_id).not.toBeNull();
    expect(await sessionRow("lab")).toMatchObject({ kind: "lab", location: null });

    const { data: run } = await db.from("sync_runs").select("*").eq("id", result.runId).single();
    expect(run).toMatchObject({ source: "timetable", status: "success", inserted: 5 });
  });

  it("keeps events without a course in your plan, unlinked, with their type guessed from the title", async () => {
    await runSync();
    expect(await sessionRow("workshop")).toMatchObject({ course_id: null, kind: "workshop", title: "Workshop; Optional class/workshop" });
    expect(await sessionRow("other")).toMatchObject({ course_id: null, kind: "lecture" }); // ZZZ 9999 is not in the plan
  });

  it("reports everything as unchanged when the feed did not change", async () => {
    await runSync();
    expect((await runSync()).counts).toEqual({ inserted: 0, updated: 0, unchanged: 5 });
  });

  it("updates times and room on a re-sync but never touches kind or is_new", async () => {
    await runSync();
    check(await db.from("class_sessions").update({ kind: "seminar", is_new: false }).eq("owner_id", OWNER).eq("ics_uid", "lecture"));

    feed = ics([pastLecture, { ...lecture, start: "20261103T140000Z", end: "20261103T154000Z", location: "Room 204" }, lab, unknownCourse, workshop]);
    const result = await runSync();

    expect(result.counts).toEqual({ inserted: 0, updated: 1, unchanged: 4 });
    const row = await sessionRow("lecture");
    expect(new Date(row.starts_at).toISOString()).toBe("2026-11-03T14:00:00.000Z");
    expect(row).toMatchObject({ location: "Room 204", kind: "seminar", is_new: false });
  });

  it("marks a future session that left the feed as cancelled, leaves past ones alone, and restores one that returns", async () => {
    await runSync();

    feed = ics([lab, unknownCourse, workshop]);
    const removed = await runSync();
    expect(removed.counts.updated).toBe(1);
    expect(await sessionRow("lecture")).toMatchObject({ cancelled: true });
    expect(await sessionRow("past")).toMatchObject({ cancelled: false });
    expect(await sessionCount()).toBe(5); // never deleted

    feed = ics([pastLecture, lecture, lab, unknownCourse, workshop]);
    await runSync();
    expect(await sessionRow("lecture")).toMatchObject({ cancelled: false });
  });

  it("keeps a session the feed marks cancelled, flagged", async () => {
    feed = ics([{ ...lecture, summary: "Canceled: TEST 1000 Lecture", status: "CANCELLED" }]);
    await runSync();
    expect(await sessionRow("lecture")).toMatchObject({ title: "TEST 1000 Lecture", cancelled: true });
  });

  it("refuses a feed with no events, and changes nothing", async () => {
    await runSync();

    feed = ics([]);
    const result = await runSync();

    expect(result.status).toBe("error");
    expect(result.error).toMatch(/no events in range/);
    expect(await sessionRow("lecture")).toMatchObject({ cancelled: false });
  });

  it("records an error and changes nothing when the download is not a calendar", async () => {
    await runSync();

    feed = "<!doctype html><title>Sign in</title>";
    const result = await runSync();

    expect(result).toMatchObject({ status: "error", error: "the feed is not an ICS calendar" });
    expect(await sessionRow("lab")).toMatchObject({ cancelled: false });
  });

  it("refuses to write a session into a course that belongs to someone else", async () => {
    const { data: course } = await db.from("courses").select("id").eq("owner_id", OWNER).eq("code", "TEST 1000").single();
    const { error } = await db.rpc("sync_class_sessions", {
      p_owner: OTHER_OWNER,
      p_rows: [
        {
          ics_uid: "x", recurrence_id: null, course_id: course?.id ?? "", kind: "lecture",
          title: "x", starts_at: "2026-11-03T10:00:00Z", ends_at: "2026-11-03T11:00:00Z", location: null, cancelled: false,
        },
      ],
      p_cancel_from: NOW.toISOString(),
      p_cancel_to: NOW.toISOString(),
    });

    expect(error?.message).toMatch(/does not belong to this owner/);
  });

  it("cannot be called with the public anon key", async () => {
    const anon = createClient<Database>(local?.url ?? "http://127.0.0.1", local?.anonKey ?? "unused", {
      auth: { persistSession: false },
    });

    const { error } = await anon.rpc("sync_class_sessions", {
      p_owner: OWNER,
      p_rows: [],
      p_cancel_from: NOW.toISOString(),
      p_cancel_to: NOW.toISOString(),
    });

    expect(error).not.toBeNull();
  });
});
