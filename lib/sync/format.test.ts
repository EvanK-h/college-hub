import { describe, expect, it } from "vitest";
import {
  describeCounts,
  describeLatestRun,
  describeSyncNow,
  describeSyncOutcome,
  formatDuration,
  formatRelativeTime,
  formatRunTime,
  type SyncRun,
} from "./format";

const now = new Date("2026-10-26T12:00:00Z");
const ago = (seconds: number) => new Date(now.getTime() - seconds * 1000);

const run = (overrides: Partial<SyncRun> = {}): SyncRun => ({
  id: "run-1",
  source: "canvas",
  status: "success",
  started_at: "2026-10-26T11:48:00Z",
  finished_at: "2026-10-26T11:48:04Z",
  inserted: 1,
  updated: 2,
  unchanged: 40,
  error_message: null,
  ...overrides,
});

describe("formatRelativeTime", () => {
  it("says just now for the first moments, including a clock a little ahead", () => {
    expect(formatRelativeTime(ago(10), now)).toBe("just now");
    expect(formatRelativeTime(ago(-30), now)).toBe("just now");
  });

  it("counts minutes, hours and days", () => {
    expect(formatRelativeTime(ago(50), now)).toBe("1 min ago");
    expect(formatRelativeTime(ago(12 * 60), now)).toBe("12 min ago");
    expect(formatRelativeTime(ago(3 * 3600 + 120), now)).toBe("3 h ago");
    expect(formatRelativeTime(ago(2 * 86400 + 3600), now)).toBe("2 d ago");
  });
});

describe("describeCounts", () => {
  it("lists new, updated and unchanged", () => {
    expect(describeCounts({ inserted: 1, updated: 2, unchanged: 40 })).toBe("1 new · 2 updated · 40 unchanged");
  });

  it("leaves out zero parts", () => {
    expect(describeCounts({ inserted: 0, updated: 0, unchanged: 42 })).toBe("42 unchanged");
  });

  it("says so when there was nothing at all", () => {
    expect(describeCounts({ inserted: 0, updated: 0, unchanged: 0 })).toBe("Nothing to sync");
  });
});

describe("formatDuration", () => {
  it("formats seconds and minutes", () => {
    expect(formatDuration("2026-10-26T11:48:00Z", "2026-10-26T11:48:04Z")).toBe("4 s");
    expect(formatDuration("2026-10-26T11:48:00Z", "2026-10-26T11:49:05Z")).toBe("1 min 5 s");
    expect(formatDuration("2026-10-26T11:48:00.000Z", "2026-10-26T11:48:00.200Z")).toBe("<1 s");
  });

  it("is null while the run is still going", () => {
    expect(formatDuration("2026-10-26T11:48:00Z", null)).toBeNull();
  });
});

describe("formatRunTime", () => {
  it("shows the time in the given zone, with the zone named", () => {
    // 05:00 UTC is 06:00 in London during British Summer Time.
    expect(formatRunTime("2026-07-01T05:00:00Z", "Europe/London")).toMatch(/1 Jul.*06:00.*BST/);
    expect(formatRunTime("2026-12-01T05:00:00Z", "Europe/London")).toMatch(/1 Dec.*05:00.*GMT/);
  });
});

describe("describeSyncOutcome", () => {
  const counts = { inserted: 1, updated: 2, unchanged: 40 };

  it("reports the counts after a successful sync", () => {
    expect(describeSyncOutcome({ runId: "r", status: "success", counts, error: null })).toEqual({
      status: "success",
      message: "Synced: 1 new · 2 updated · 40 unchanged",
    });
  });

  it("says when another sync was already running", () => {
    const outcome = describeSyncOutcome({ status: "skipped", reason: "another sync is already running" });
    expect(outcome.status).toBe("skipped");
    expect(outcome.message).toMatch(/already running/);
  });

  it("tells you to replace an expired token", () => {
    const outcome = describeSyncOutcome({ runId: "r", status: "token_expired", counts, error: "token detail" });
    expect(outcome).toMatchObject({ status: "error" });
    expect(outcome.message).toMatch(/token/);
    expect(outcome.message).not.toContain("token detail");
  });

  it("passes on the recorded reason for a failed sync", () => {
    const outcome = describeSyncOutcome({ runId: "r", status: "error", counts, error: "TEST 1000: Canvas request failed" });
    expect(outcome).toEqual({
      status: "error",
      message: "Sync finished with errors: TEST 1000: Canvas request failed",
    });
  });
});

describe("describeSyncNow", () => {
  const counts = { inserted: 1, updated: 0, unchanged: 3 };
  const success = { runId: "r", status: "success" as const, counts, error: null };

  it("reports Canvas alone while the timetable isn't set up", () => {
    expect(describeSyncNow(success, null)).toEqual({ status: "success", message: "Synced: 1 new · 3 unchanged" });
  });

  it("reports both when both ran", () => {
    expect(describeSyncNow(success, success)).toEqual({
      status: "success",
      message: "Canvas: Synced: 1 new · 3 unchanged Timetable: Synced: 1 new · 3 unchanged",
    });
  });

  it("takes the worse status of the two", () => {
    const failed = { ...success, status: "error" as const, error: "the feed is not an ICS calendar" };
    const outcome = describeSyncNow(success, failed);
    expect(outcome.status).toBe("error");
    expect(outcome.message).toContain("the feed is not an ICS calendar");
  });
});

describe("describeLatestRun", () => {
  it("explains an empty history, with the caller's hint", () => {
    expect(describeLatestRun(null, null, now).headline).toBe("No syncs yet");
    expect(describeLatestRun(null, null, now, "Set it up first.").details).toEqual(["Set it up first."]);
  });

  it("summarises a successful run", () => {
    expect(describeLatestRun(run(), run(), now)).toEqual({
      headline: "Synced 11 min ago", // finished 11 min 56 s ago, rounded down
      details: ["1 new · 2 updated · 40 unchanged"],
    });
  });

  it("shows a run in progress", () => {
    const running = run({ status: "running", finished_at: null });
    expect(describeLatestRun(running, null, now).headline).toBe("Syncing…");
  });

  it("names an expired token and when the last good sync was", () => {
    const expired = run({ status: "token_expired", finished_at: "2026-10-26T11:55:00Z" });
    expect(describeLatestRun(expired, run(), now)).toEqual({
      headline: "Canvas token expired 5 min ago",
      details: ["Last successful sync 11 min ago"],
    });
  });

  it("shows a failure's reason, and says when there has never been a good sync", () => {
    const failed = run({ status: "error", error_message: "TEST 1000: Canvas request failed with status 500" });
    expect(describeLatestRun(failed, null, now)).toEqual({
      headline: "Last sync failed 11 min ago",
      details: ["TEST 1000: Canvas request failed with status 500", "No successful sync yet"],
    });
  });
});
