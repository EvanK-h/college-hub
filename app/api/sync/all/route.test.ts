import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/canvas/run-sync", () => ({ runCanvasSync: vi.fn() }));

import { runCanvasSync } from "@/lib/canvas/run-sync";
import { GET, POST } from "./route";

// Made-up secret, long enough to pass the 32-character minimum.
const SECRET = "a-made-up-secret-that-is-long-enough-0123456789";
const mockedSync = vi.mocked(runCanvasSync);
const request = (authorization?: string) =>
  new Request("https://hub.example.com/api/sync/all", {
    headers: authorization ? { authorization } : {},
  });

const success = {
  runId: "run-1",
  status: "success" as const,
  counts: { inserted: 1, updated: 0, unchanged: 3 },
  error: null,
};

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", SECRET);
  mockedSync.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("/api/sync/all", () => {
  it("rejects a request with no Authorization header and never starts a sync", async () => {
    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(mockedSync).not.toHaveBeenCalled();
  });

  it("rejects a wrong secret", async () => {
    const response = await GET(request("Bearer wrong-secret"));

    expect(response.status).toBe(401);
    expect(mockedSync).not.toHaveBeenCalled();
  });

  it("fails closed with a 500 when CRON_SECRET is missing or too short", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("CRON_SECRET", "");
    expect((await GET(request("Bearer "))).status).toBe(500);

    vi.stubEnv("CRON_SECRET", "short");
    expect((await GET(request("Bearer short"))).status).toBe(500);
    expect(mockedSync).not.toHaveBeenCalled();
  });

  it("runs the sync and returns its result for the right secret, on GET and POST", async () => {
    mockedSync.mockResolvedValue(success);

    for (const handler of [GET, POST]) {
      const response = await handler(request(`Bearer ${SECRET}`));
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(success);
    }
    expect(mockedSync).toHaveBeenCalledTimes(2);
  });

  it("returns 200 when the run was skipped because another sync is already going", async () => {
    const skipped = { status: "skipped" as const, reason: "another sync is already running" };
    mockedSync.mockResolvedValue(skipped);

    const response = await GET(request(`Bearer ${SECRET}`));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(skipped);
  });

  it("returns 502 when the run ends in error or token_expired", async () => {
    mockedSync.mockResolvedValue({ ...success, status: "token_expired", error: "Canvas rejected the access token" });

    const response = await GET(request(`Bearer ${SECRET}`));

    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ status: "token_expired" });
  });

  it("returns a generic 500, without the error text, if the sync throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockedSync.mockRejectedValue(new Error("connection string postgres://secret@host"));

    const response = await GET(request(`Bearer ${SECRET}`));

    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("postgres://");
  });
});
