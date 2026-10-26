import "server-only";
import { z } from "zod";
import {
  canvasAnnouncementSchema,
  canvasAssignmentGroupSchema,
  canvasCourseSchema,
  type CanvasAnnouncement,
  type CanvasAssignmentGroup,
  type CanvasCourse,
} from "./schemas";

/** Canvas rejected the token (401). The sync records "token expired" and stops. */
export class CanvasAuthError extends Error {
  constructor() {
    super("Canvas rejected the access token (401); it has probably expired");
    this.name = "CanvasAuthError";
  }
}

/** A failed request. Carries the path and status only, never the URL's query, headers or token. */
export class CanvasRequestError extends Error {
  constructor(
    readonly path: string,
    readonly status: number | null,
    detail?: string,
  ) {
    super(
      `Canvas request to ${path} failed${status === null ? "" : ` with status ${status}`}${detail ? `: ${detail}` : ""}`,
    );
    this.name = "CanvasRequestError";
  }
}

/** Canvas answered, but not in the shape the Zod schema expects. */
export class CanvasValidationError extends Error {
  constructor(path: string, detail: string) {
    super(`Canvas response for ${path} failed validation: ${detail}`);
    this.name = "CanvasValidationError";
  }
}

const PER_PAGE = 100;
const MAX_PAGES = 50; // guards against a Link header that loops back on itself
const RETRY_DELAYS_MS = [1000, 2000, 4000]; // up to three retries on a 429
const MAX_RETRY_AFTER_MS = 10_000;

type Sleep = (ms: number) => Promise<void>;

export type CanvasClientOptions = {
  baseUrl: string;
  token: string;
  /** Injected so tests can use a fake; defaults to the global fetch. */
  fetch?: typeof globalThis.fetch;
  /** Injected so tests don't actually wait during backoff. */
  sleep?: Sleep;
};

/** Returns the `rel="next"` URL from a Canvas `Link` header, or null on the last page. */
export function parseNextLink(header: string | null): string | null {
  if (!header) return null;
  for (const match of header.matchAll(/<([^>]*)>\s*;\s*rel="([^"]*)"/g)) {
    const [, url, rel] = match;
    if (url && rel?.split(/\s+/).includes("next")) return url;
  }
  return null;
}

function retryDelayMs(response: Response, attempt: number): number {
  // Canvas's docs don't mention Retry-After, but honour it if it's there.
  const retryAfter = Number(response.headers.get("retry-after"));
  if (response.headers.has("retry-after") && Number.isFinite(retryAfter) && retryAfter >= 0) {
    return Math.min(retryAfter * 1000, MAX_RETRY_AFTER_MS);
  }
  return RETRY_DELAYS_MS[attempt] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]!;
}

function describeIssues(error: z.ZodError): string {
  // Paths and messages only: the offending values could be grades or other personal data.
  return error.issues
    .slice(0, 5)
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ");
}

/**
 * A read-only Canvas client. It can only send GET requests, one at a time, and every
 * response is validated with Zod before it is returned.
 */
export function createCanvasClient({
  baseUrl,
  token,
  fetch: fetchFn = globalThis.fetch,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}: CanvasClientOptions) {
  const origin = new URL(baseUrl).origin;

  async function get(url: string, path: string): Promise<Response> {
    for (let attempt = 0; ; attempt++) {
      const response = await fetchFn(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        cache: "no-store",
      });

      if (response.status === 401) throw new CanvasAuthError();
      if (response.status === 429 && attempt < RETRY_DELAYS_MS.length) {
        await sleep(retryDelayMs(response, attempt));
        continue;
      }
      if (!response.ok) throw new CanvasRequestError(path, response.status);
      return response;
    }
  }

  /** Fetches every page of a list endpoint by following the Link header's rel="next". */
  async function getAll<S extends z.ZodType>(
    path: string,
    params: URLSearchParams,
    schema: S,
  ): Promise<z.infer<S>[]> {
    const first = new URL(`/api/v1${path}`, origin);
    params.forEach((value, key) => first.searchParams.append(key, value));
    first.searchParams.set("per_page", String(PER_PAGE));

    const items: z.infer<S>[] = [];
    let next: string | null = first.toString();

    for (let page = 1; next; page++) {
      if (page > MAX_PAGES) throw new CanvasRequestError(path, null, `more than ${MAX_PAGES} pages`);

      const response = await get(next, path);

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        throw new CanvasValidationError(path, "response was not valid JSON");
      }
      const parsed = z.array(schema).safeParse(body);
      if (!parsed.success) throw new CanvasValidationError(path, describeIssues(parsed.error));
      items.push(...parsed.data);

      next = parseNextLink(response.headers.get("link"));
      // Never send the token to a host other than the Canvas one we were configured with.
      if (next && new URL(next, origin).origin !== origin) {
        throw new CanvasRequestError(path, null, "next page link points to a different host");
      }
    }
    return items;
  }

  return {
    /** Active courses, with the current score in `enrollments`. */
    listActiveCourses(): Promise<CanvasCourse[]> {
      const params = new URLSearchParams({ enrollment_state: "active" });
      params.append("include[]", "total_scores");
      return getAll("/courses", params, canvasCourseSchema);
    },

    /** Grading groups with their assignments and your submission, in one call per course. */
    listAssignmentGroups(canvasCourseId: number): Promise<CanvasAssignmentGroup[]> {
      const params = new URLSearchParams();
      params.append("include[]", "assignments");
      params.append("include[]", "submission");
      return getAll(`/courses/${canvasCourseId}/assignment_groups`, params, canvasAssignmentGroupSchema);
    },

    /** One course's announcements posted since the given date. */
    listAnnouncements(canvasCourseId: number, since: Date): Promise<CanvasAnnouncement[]> {
      const params = new URLSearchParams({ start_date: since.toISOString() });
      params.append("context_codes[]", `course_${canvasCourseId}`);
      return getAll("/announcements", params, canvasAnnouncementSchema);
    },
  };
}

export type CanvasClient = ReturnType<typeof createCanvasClient>;
