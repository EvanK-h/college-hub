const PUBLIC_PATHS = ["/login"];
// /api/sync/ is public to the proxy because cron callers have no session; each route there
// checks `Authorization: Bearer ${CRON_SECRET}` itself and rejects everything else.
const PUBLIC_PREFIXES = ["/auth/", "/api/sync/"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname) || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/** Where the proxy should send this request, or null to let it through. */
export function redirectTarget(pathname: string, signedIn: boolean): string | null {
  if (!signedIn && !isPublicPath(pathname)) return "/login";
  if (signedIn && pathname === "/login") return "/";
  return null;
}
