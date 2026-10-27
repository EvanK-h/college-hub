import "server-only";

const TIMEOUT_MS = 20_000;

/**
 * Downloads the published Outlook calendar. Anyone with the URL can read the calendar, so it is
 * treated like a password: no error message here ever contains it.
 */
export async function fetchTimetableFeed(url: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { accept: "text/calendar" },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new Error("could not reach the timetable feed");
  }
  if (!response.ok) throw new Error(`the timetable feed answered with status ${response.status}`);
  return response.text();
}
