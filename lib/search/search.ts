// Global search (⌘K): pages, courses, assignments and announcements. The pure parts live here; the
// database part is the `search` Server Action in app/(app)/actions.ts.

export type SearchKind = "page" | "course" | "assignment" | "announcement";
export type SearchResult = { id: string; kind: SearchKind; label: string; detail: string; href: string };

export const SEARCH_KIND_LABELS: Record<SearchKind, string> = {
  page: "Pages",
  course: "Courses",
  assignment: "Assignments",
  announcement: "Announcements",
};

export const MIN_QUERY_LENGTH = 2;

/**
 * The query as an ILIKE pattern ("%cs 21%"), or null if it is too short to be worth a request.
 * Wildcards and the characters PostgREST uses to separate filters (commas, parentheses) are
 * dropped, so typed text can only ever match literally.
 */
export function searchPattern(query: string): string | null {
  const cleaned = query.replace(/[%_,()\\*"]/g, " ").replace(/\s+/g, " ").trim();
  return cleaned.length >= MIN_QUERY_LENGTH ? `%${cleaned}%` : null;
}

const PAGES: { label: string; href: string; keywords: string }[] = [
  { label: "Dashboard", href: "/", keywords: "home today agenda todos" },
  { label: "Calendar", href: "/calendar", keywords: "timetable schedule classes week month" },
  { label: "Pathway", href: "/pathway", keywords: "plan degree terms board" },
  { label: "Requirements", href: "/pathway/requirements", keywords: "audit progress attributes nupath" },
  { label: "Swaps", href: "/pathway/swaps", keywords: "swap options electives focus relevance" },
  { label: "Prerequisites", href: "/pathway/graph", keywords: "graph prereqs chain" },
  { label: "What-if plans", href: "/pathway/plans", keywords: "plans compare scenarios" },
  { label: "Settings", href: "/settings", keywords: "sync canvas feed appearance theme dark light" },
];

/** Pages whose name or keywords contain the query; with no query, every page (a quick switcher). */
export function matchPages(query: string): SearchResult[] {
  const needle = query.trim().toLowerCase();
  return PAGES.filter((page) => !needle || `${page.label} ${page.keywords}`.toLowerCase().includes(needle)).map((page) => ({
    id: `page:${page.href}`,
    kind: "page",
    label: page.label,
    detail: "",
    href: page.href,
  }));
}
