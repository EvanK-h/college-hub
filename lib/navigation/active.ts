/**
 * The nav link for the current page: the longest href that is the path itself or a parent of it,
 * so `/pathway/plans/abc` lights up Pathway and `/pathway/requirements` beats `/pathway`. `/` only
 * matches itself, and `fallback` covers pages with no tab of their own (course pages for now).
 */
export function activeHref(pathname: string, hrefs: readonly string[], fallback: string | null = null): string | null {
  const matches = hrefs.filter((href) => pathname === href || (href !== "/" && pathname.startsWith(`${href}/`)));
  if (matches.length === 0) return fallback;
  return matches.reduce((best, href) => (href.length > best.length ? href : best));
}
