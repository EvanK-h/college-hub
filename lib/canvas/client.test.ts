import { describe, expect, it, vi } from "vitest";
import {
  CanvasAuthError,
  CanvasRequestError,
  CanvasValidationError,
  createCanvasClient,
  parseNextLink,
} from "./client";

// Everything here is invented: a fake host, a fake token and made-up courses.
const BASE = "https://canvas.example.edu";
const TOKEN = "fake-token-for-tests";

const course = (id: number) => ({ id, name: `Course ${id}` });
const json = (body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status: 200, headers });
const status = (code: number, headers: Record<string, string> = {}) =>
  new Response(null, { status: code, headers });

/** A client whose fetch returns the given responses in order, and whose sleep returns instantly. */
function setup(responses: Response[]) {
  const fetch = vi.fn<typeof globalThis.fetch>();
  for (const response of responses) fetch.mockResolvedValueOnce(response);
  const sleep = vi.fn<(ms: number) => Promise<void>>().mockResolvedValue(undefined);
  const client = createCanvasClient({ baseUrl: BASE, token: TOKEN, fetch, sleep });
  return { client, fetch, sleep };
}

const requestedUrl = (fetch: ReturnType<typeof setup>["fetch"], call = 0) =>
  new URL(String(fetch.mock.calls[call]?.[0]));

describe("parseNextLink", () => {
  it("returns the rel=next URL", () => {
    const header =
      `<${BASE}/api/v1/courses?page=1>; rel="current",` +
      `<${BASE}/api/v1/courses?page=2>; rel="next",` +
      `<${BASE}/api/v1/courses?page=5>; rel="last"`;
    expect(parseNextLink(header)).toBe(`${BASE}/api/v1/courses?page=2`);
  });

  it("returns null on the last page or with no header", () => {
    expect(parseNextLink(`<${BASE}/api/v1/courses?page=5>; rel="last"`)).toBeNull();
    expect(parseNextLink(null)).toBeNull();
  });
});

describe("createCanvasClient requests", () => {
  it("sends a GET with the bearer token, per_page=100 and the include flags", async () => {
    const { client, fetch } = setup([json([course(101)])]);
    await client.listActiveCourses();

    const init = fetch.mock.calls[0]?.[1];
    expect(init?.method ?? "GET").toBe("GET");
    expect(init?.headers).toMatchObject({ Authorization: `Bearer ${TOKEN}` });

    const url = requestedUrl(fetch);
    expect(url.pathname).toBe("/api/v1/courses");
    expect(url.searchParams.get("per_page")).toBe("100");
    expect(url.searchParams.get("enrollment_state")).toBe("active");
    expect(url.searchParams.getAll("include[]")).toEqual(["total_scores"]);
  });

  it("asks for assignments and submissions in one call per course", async () => {
    const { client, fetch } = setup([json([])]);
    await client.listAssignmentGroups(101);

    const url = requestedUrl(fetch);
    expect(url.pathname).toBe("/api/v1/courses/101/assignment_groups");
    expect(url.searchParams.getAll("include[]")).toEqual(["assignments", "submission"]);
  });

  it("scopes announcements to one course and a start date", async () => {
    const { client, fetch } = setup([json([])]);
    await client.listAnnouncements(101, new Date("2026-08-27T00:00:00Z"));

    const url = requestedUrl(fetch);
    expect(url.pathname).toBe("/api/v1/announcements");
    expect(url.searchParams.getAll("context_codes[]")).toEqual(["course_101"]);
    expect(url.searchParams.get("start_date")).toBe("2026-08-27T00:00:00.000Z");
  });
});

describe("createCanvasClient pagination", () => {
  it("follows rel=next and combines the pages", async () => {
    const next = `${BASE}/api/v1/courses?page=2&per_page=100`;
    const { client, fetch } = setup([
      json([course(101), course(102)], { link: `<${next}>; rel="next"` }),
      json([course(103)]),
    ]);

    const courses = await client.listActiveCourses();

    expect(courses.map((c) => c.id)).toEqual([101, 102, 103]);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(String(fetch.mock.calls[1]?.[0])).toBe(next);
  });

  it("refuses a next link on another host, so the token never leaves Canvas", async () => {
    const { client, fetch } = setup([
      json([course(101)], { link: `<https://evil.example.net/steal>; rel="next"` }),
    ]);

    await expect(client.listActiveCourses()).rejects.toThrow(CanvasRequestError);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("stops if the Link header never ends", async () => {
    const loop = `<${BASE}/api/v1/courses?page=2>; rel="next"`;
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async () => json([], { link: loop }));
    const client = createCanvasClient({ baseUrl: BASE, token: TOKEN, fetch, sleep: async () => {} });

    await expect(client.listActiveCourses()).rejects.toThrow(/more than 50 pages/);
    expect(fetch).toHaveBeenCalledTimes(50);
  });
});

describe("createCanvasClient errors and retries", () => {
  it("retries a 429 and then succeeds", async () => {
    const { client, fetch, sleep } = setup([status(429), json([course(101)])]);

    await expect(client.listActiveCourses()).resolves.toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledExactlyOnceWith(1000);
  });

  it("gives up after three retries, backing off 1s, 2s, 4s", async () => {
    const { client, fetch, sleep } = setup([status(429), status(429), status(429), status(429)]);

    await expect(client.listActiveCourses()).rejects.toMatchObject({ name: "CanvasRequestError", status: 429 });
    expect(fetch).toHaveBeenCalledTimes(4);
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([1000, 2000, 4000]);
  });

  it("honours Retry-After when Canvas sends it", async () => {
    const { client, sleep } = setup([status(429, { "retry-after": "3" }), json([])]);
    await client.listActiveCourses();
    expect(sleep).toHaveBeenCalledExactlyOnceWith(3000);
  });

  it("stops at once on a 401 with a CanvasAuthError", async () => {
    const { client, fetch, sleep } = setup([status(401)]);

    await expect(client.listActiveCourses()).rejects.toThrow(CanvasAuthError);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("does not retry other failures", async () => {
    const { client, fetch } = setup([status(500)]);

    await expect(client.listActiveCourses()).rejects.toMatchObject({ name: "CanvasRequestError", status: 500 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("throws CanvasValidationError when the payload has the wrong shape", async () => {
    const { client } = setup([json([{ name: "No id here" }])]);
    await expect(client.listActiveCourses()).rejects.toThrow(CanvasValidationError);
  });

  it("throws CanvasValidationError when the body isn't JSON", async () => {
    const { client } = setup([new Response("<html>maintenance</html>", { status: 200 })]);
    await expect(client.listActiveCourses()).rejects.toThrow(CanvasValidationError);
  });

  it("never puts the token in an error message", async () => {
    const failures = [status(401), status(500), json([{ name: "No id here" }])];
    for (const response of failures) {
      const { client } = setup([response]);
      const error = await client.listActiveCourses().then(
        () => null,
        (e: unknown) => e as Error,
      );
      expect(error?.message).toBeDefined();
      expect(error?.message).not.toContain(TOKEN);
    }
  });
});
