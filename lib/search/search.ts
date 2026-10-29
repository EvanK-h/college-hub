import { codeFromSlug } from "@/lib/courses/slug";

// Global search (⌘K): pages, courses, assignments and announcements, plus a few actions. The pure
// parts live here; the database parts are the `search` and `termCourses` Server Actions in
// app/(app)/actions.ts, and recent pages are in ./recent.ts.

export type SearchKind = "recent" | "this-term" | "action" | "page" | "course" | "assignment" | "announcement";
/** Things the palette can do rather than open. Each is run in the browser by the palette. */
export type PaletteAction = "add-todo" | "sync" | "new-plan" | "theme-dark" | "theme-light" | "theme-system";
/** A result either opens a page (`href`) or runs an action. */
export type SearchResult = { id: string; kind: SearchKind; label: string; detail: string } & ({ href: string } | { action: PaletteAction });

export const SEARCH_KIND_LABELS: Record<SearchKind, string> = {
  recent: "Recent",
  "this-term": "This term",
  action: "Actions",
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
  { label: "Today", href: "/", keywords: "dashboard home agenda todos" },
  { label: "Calendar", href: "/calendar", keywords: "timetable schedule classes week month" },
  { label: "Courses", href: "/courses", keywords: "classes grades canvas term" },
  { label: "Announcements", href: "/announcements", keywords: "inbox unread news messages" },
  { label: "Pathway", href: "/pathway", keywords: "plan degree terms board" },
  { label: "Requirements", href: "/pathway/requirements", keywords: "audit progress attributes nupath" },
  { label: "Swaps", href: "/pathway/swaps", keywords: "swap options electives focus relevance" },
  { label: "Prerequisites", href: "/pathway?view=graph", keywords: "graph prereqs chain" },
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

const ACTIONS: { action: PaletteAction; label: string; keywords: string }[] = [
  { action: "add-todo", label: "Add a to-do…", keywords: "new task todo remind" },
  { action: "sync", label: "Sync now", keywords: "canvas timetable refresh update" },
  { action: "new-plan", label: "New what-if plan…", keywords: "create plan scenario copy" },
  { action: "theme-dark", label: "Use dark appearance", keywords: "theme night mode" },
  { action: "theme-light", label: "Use light appearance", keywords: "theme day mode" },
  { action: "theme-system", label: "Match the system appearance", keywords: "theme auto mode" },
];

/** Actions whose name or keywords contain the query; with no query, every action. */
export function matchActions(query: string): SearchResult[] {
  const needle = query.trim().toLowerCase();
  return ACTIONS.filter((item) => !needle || `${item.label} ${item.keywords}`.toLowerCase().includes(needle)).map((item) => ({
    id: `action:${item.action}`,
    kind: "action",
    label: item.label,
    detail: "",
    action: item.action,
  }));
}

/** The palette's name for a page you can be on: a listed page, or a course page by its code. */
export function pageAt(pathname: string): { href: string; label: string } | null {
  const listed = PAGES.find((page) => page.href === pathname);
  if (listed) return { href: listed.href, label: listed.label };
  const slug = /^\/courses\/([^/]+)$/.exec(pathname)?.[1];
  const code = slug ? codeFromSlug(slug) : null;
  return code ? { href: pathname, label: code } : null;
}

