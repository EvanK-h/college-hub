const PUBLIC_PATHS = ["/login"];
const PUBLIC_PREFIXES = ["/auth/"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname) || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/** Where the proxy should send this request, or null to let it through. */
export function redirectTarget(pathname: string, signedIn: boolean): string | null {
  if (!signedIn && !isPublicPath(pathname)) return "/login";
  if (signedIn && pathname === "/login") return "/";
  return null;
}
