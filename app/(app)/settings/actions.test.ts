import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/canvas/run-sync", () => ({ runCanvasSync: vi.fn() }));
vi.mock("@/lib/timetable/run-sync", () => ({ runTimetableSync: vi.fn() }));

import { revalidatePath } from "next/cache";
import { runCanvasSync } from "@/lib/canvas/run-sync";
import { createClient } from "@/lib/supabase/server";
import { runTimetableSync } from "@/lib/timetable/run-sync";
import { syncNow } from "./actions";

const mockedSync = vi.mocked(runCanvasSync);

/** Makes createClient return a client that is, or is not, signed in. */
function signIn(signedIn: boolean) {
  const client = { auth: { getClaims: async () => ({ data: signedIn ? { claims: { sub: "user" } } : null }) } };
  vi.mocked(createClient).mockResolvedValue(client as unknown as Awaited<ReturnType<typeof createClient>>);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("OUTLOOK_ICS_URL", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("syncNow", () => {
  it("does nothing without a session: the sync uses the service role, which skips RLS", async () => {
    signIn(false);

    const result = await syncNow();

    expect(result.status).toBe("error");
    expect(mockedSync).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("runs the sync and refreshes the page when signed in", async () => {
    signIn(true);
    mockedSync.mockResolvedValue({
      runId: "run-1",
      status: "success",
      counts: { inserted: 1, updated: 0, unchanged: 3 },
      error: null,
    });

    const result = await syncNow();

    expect(result).toEqual({ status: "success", message: "Synced: 1 new · 3 unchanged" });
    expect(revalidatePath).toHaveBeenCalledWith("/settings");
    expect(runTimetableSync).not.toHaveBeenCalled(); // the feed isn't set up
  });

  it("syncs the timetable too once the feed is set up", async () => {
    signIn(true);
    vi.stubEnv("OUTLOOK_ICS_URL", "https://calendar.example.com/feed.ics");
    const success = { runId: "run-1", status: "success" as const, counts: { inserted: 0, updated: 0, unchanged: 3 }, error: null };
    mockedSync.mockResolvedValue(success);
    vi.mocked(runTimetableSync).mockResolvedValue(success);

    const result = await syncNow();

    expect(runTimetableSync).toHaveBeenCalledTimes(1);
    expect(result.message).toMatch(/^Canvas: .* Timetable: /);
  });

  it("reports a skipped sync without treating it as an error", async () => {
    signIn(true);
    mockedSync.mockResolvedValue({ status: "skipped", reason: "another sync is already running" });

    expect((await syncNow()).status).toBe("skipped");
  });

  it("gives a fixed message, not the error text, if the sync throws", async () => {
    signIn(true);
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockedSync.mockRejectedValue(new Error("connection string postgres://secret@host"));

    const result = await syncNow();

    expect(result.status).toBe("error");
    expect(result.message).not.toContain("postgres://");
  });
});
