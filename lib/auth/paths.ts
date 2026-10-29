// The web app manifest is fetched without cookies, so it must be public (it holds nothing private).
const PUBLIC_PATHS = ["/login", "/manifest.webmanifest"];
// /api/sync/ is public to the proxy because cron callers have no session; each route there
// checks `Authorization: Bearer ${CRON_SECRET}` itself and rejects everything else.
// /api/calendar/ is public because a phone's calendar app has no session; the token in the URL is
// checked by calendar_feed() in the database.
const PUBLIC_PREFIXES = ["/auth/", "/api/sync/", "/api/calendar/"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname) || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/** Where the proxy should send this request, or null to let it through. */
export function redirectTarget(pathname: string, signedIn: boolean): string | null {
  if (!signedIn && !isPublicPath(pathname)) return "/login";
  if (signedIn && pathname === "/login") return "/";
  return null;
}
