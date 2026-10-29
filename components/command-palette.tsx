"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, Clock, FileText, FlaskConical, LayoutGrid, Megaphone, Monitor, Moon, Plus, RefreshCw, Search, Sun, type LucideIcon } from "lucide-react";
import { addTodo, search, termCourses } from "@/app/(app)/actions";
import { syncNow } from "@/app/(app)/settings/actions";
import { applyTheme } from "@/components/theme-toggle";
import { useToast } from "@/components/toast";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { parseRecent, RECENT_STORAGE_KEY, rememberPage, type RecentPage } from "@/lib/search/recent";
import {
  matchActions,
  matchPages,
  MIN_QUERY_LENGTH,
  pageAt,
  SEARCH_KIND_LABELS,
  type PaletteAction,
  type SearchKind,
  type SearchResult,
} from "@/lib/search/search";
import { cn } from "@/lib/utils";

const KIND_ICONS: Record<SearchKind, LucideIcon> = {
  recent: Clock,
  "this-term": BookOpen,
  action: Plus,
  page: LayoutGrid,
  course: BookOpen,
  assignment: FileText,
  announcement: Megaphone,
};
const ACTION_ICONS: Record<PaletteAction, LucideIcon> = {
  "add-todo": Plus,
  sync: RefreshCw,
  "new-plan": FlaskConical,
  "theme-dark": Moon,
  "theme-light": Sun,
  "theme-system": Monitor,
};
// Actions come before pages once you type, so "sync" runs a sync rather than opening Settings.
const KIND_ORDER: SearchKind[] = ["recent", "this-term", "action", "page", "course", "assignment", "announcement"];
const DEBOUNCE_MS = 150;

function readRecent(): RecentPage[] {
  try {
    return parseRecent(localStorage.getItem(RECENT_STORAGE_KEY));
  } catch {
    return [];
  }
}

// Global search and commands: ⌘K (Ctrl+K elsewhere) or the header button opens it. With nothing
// typed it offers your recent pages, this term's courses and the actions. As you type, actions
// and pages match in the browser; courses, assignments and announcements come from the server.
// Arrow keys move through the results and Enter opens or runs one. "Add a to-do…" turns the
// input into the to-do's title (Backspace on an empty input goes back to searching).
// It follows the ARIA combobox pattern: focus stays in the input and aria-activedescendant points
// at the highlighted option, so screen readers announce it.
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"search" | "todo">("search");
  const [query, setQuery] = useState("");
  const [remote, setRemote] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState<RecentPage[]>([]);
  const [term, setTerm] = useState<SearchResult[] | null>(null);
  const [todoError, setTodoError] = useState("");
  // The page you're on when it opens, which the recent list leaves out.
  const [here, setHere] = useState("");
  const latest = useRef(0);
  const router = useRouter();
  const toast = useToast();
  const listId = useId();

  function show() {
    setRecent(readRecent());
    setHere(window.location.pathname);
    setOpen(true);
    if (term === null) termCourses().then(setTerm, () => setTerm([]));
  }

  // Ask the server after a short pause in typing; a slow answer to an older query is dropped.
  useEffect(() => {
    if (mode !== "search" || query.trim().length < MIN_QUERY_LENGTH) return;
    const request = ++latest.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      const found = await search(query).catch(() => []);
      if (request !== latest.current) return;
      setRemote(found);
      setLoading(false);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, mode]);

  const empty = query.trim() === "";
  const short = query.trim().length < MIN_QUERY_LENGTH;
  const results: SearchResult[] =
    mode === "todo"
      ? []
      : empty
        ? [
            ...recent
              .filter((page) => page.href !== here)
              .map((page) => ({ id: `recent:${page.href}`, kind: "recent" as const, label: page.label, detail: "", href: page.href })),
            ...(term ?? []),
            ...matchActions(""),
          ]
        : [...matchActions(query), ...matchPages(query), ...(short ? [] : remote)];
  // Results in display order, each with its position in the whole list (for arrow keys and ids).
  const flat = KIND_ORDER.flatMap((kind) => results.filter((result) => result.kind === kind));
  const groups = KIND_ORDER.map((kind) => ({
    kind,
    items: flat.flatMap((result, position) => (result.kind === kind ? [{ result, position }] : [])),
  })).filter((group) => group.items.length > 0);
  const activeIndex = Math.min(active, Math.max(0, flat.length - 1));
  const optionId = (index: number) => `${listId}-option-${index}`;

  function reset() {
    latest.current += 1; // drop any answer still on its way
    setMode("search");
    setQuery("");
    setRemote([]);
    setLoading(false);
    setActive(0);
    setTodoError("");
  }

  function close() {
    setOpen(false);
    reset();
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (open) close();
        else show();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function run(action: PaletteAction) {
    switch (action) {
      case "add-todo":
        reset();
        setMode("todo");
        return;
      case "sync":
        close();
        toast({ message: "Syncing…" });
        syncNow().then(
          (result) => {
            toast({ message: result.message });
            router.refresh();
          },
          () => toast({ message: "The sync could not run." }),
        );
        return;
      case "new-plan":
        close();
        router.push("/pathway/plans?new");
        return;
      case "theme-dark":
      case "theme-light":
      case "theme-system":
        close();
        applyTheme(action === "theme-dark" ? "dark" : action === "theme-light" ? "light" : "system");
        return;
    }
  }

  function go(result: SearchResult | undefined) {
    if (!result) return;
    if ("action" in result) {
      run(result.action);
      return;
    }
    close();
    router.push(result.href);
  }

  async function saveTodo() {
    const title = query.trim();
    if (!title) return;
    const form = new FormData();
    form.set("title", title);
    const result = await addTodo({ status: "idle", message: "" }, form);
    if (result.status !== "saved") {
      setTodoError(result.message);
      return;
    }
    close();
    toast({ message: `Added “${title}”` });
  }

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (mode === "todo") {
      if (event.key === "Enter") {
        event.preventDefault();
        void saveTodo();
      } else if (event.key === "Backspace" && query === "") {
        event.preventDefault();
        reset();
      }
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (flat.length === 0) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      const next = (activeIndex + step + flat.length) % flat.length;
      setActive(next);
      document.getElementById(optionId(next))?.scrollIntoView({ block: "nearest" });
    } else if (event.key === "Enter") {
      event.preventDefault();
      go(flat[activeIndex]);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={show}
        aria-keyshortcuts="Meta+K Control+K"
        className="press flex shrink-0 items-center gap-2 rounded-full bg-fill-secondary px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring sm:px-3"
      >
        <Search aria-hidden className="size-4" />
        <span className="sr-only sm:not-sr-only">Search</span>
        <kbd aria-hidden className="hidden rounded-md bg-card px-1.5 font-sans text-xs shadow-card lg:inline">
          ⌘K
        </kbd>
      </button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (next) show();
          else close();
        }}
      >
        <DialogContent className="gap-0 overflow-hidden p-0 sm:top-[12vh] sm:max-w-lg sm:translate-y-0" showCloseButton={false}>
          <DialogTitle className="sr-only">{mode === "todo" ? "Add a to-do" : "Search"}</DialogTitle>
          <div className="flex items-center gap-2 border-b border-separator px-4">
            {mode === "todo" ? (
              <span className="shrink-0 rounded-full bg-fill-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">New to-do</span>
            ) : (
              <Search aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            )}
            {mode === "todo" ? (
              <input
                key="todo"
                autoFocus
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setTodoError("");
                }}
                onKeyDown={onInputKeyDown}
                aria-label="To-do"
                aria-describedby={`${listId}-hint`}
                maxLength={200}
                placeholder="What needs doing?"
                className="h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-tertiary-foreground"
              />
            ) : (
              <input
                key="search"
                autoFocus
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActive(0);
                }}
                onKeyDown={onInputKeyDown}
                role="combobox"
                aria-expanded={flat.length > 0}
                aria-controls={listId}
                aria-activedescendant={flat.length > 0 ? optionId(activeIndex) : undefined}
                aria-autocomplete="list"
                aria-label="Search courses, assignments, announcements and pages, or run an action"
                placeholder="Search, or type a command…"
                className="h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-tertiary-foreground"
              />
            )}
          </div>

          <div id={listId} role="listbox" aria-label="Results" className="max-h-[min(60vh,26rem)] overflow-y-auto p-2 empty:hidden">
            {groups.map((group) => (
              <div key={group.kind} role="group" aria-labelledby={`${listId}-${group.kind}`} className="pb-1">
                <p id={`${listId}-${group.kind}`} className="px-2 pt-2 pb-1 text-xs font-semibold text-muted-foreground">
                  {SEARCH_KIND_LABELS[group.kind]}
                </p>
                {group.items.map(({ result, position: current }) => {
                  const Icon = "action" in result ? ACTION_ICONS[result.action] : KIND_ICONS[result.kind];
                  return (
                    // Options are chosen with the keyboard from the input, or by pointer here.
                    <div
                      key={result.id}
                      id={optionId(current)}
                      role="option"
                      aria-selected={current === activeIndex}
                      onPointerMove={() => setActive(current)}
                      onClick={() => go(result)}
                      className={cn("flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm", current === activeIndex && "bg-fill")}
                    >
                      <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{result.label}</span>
                      {result.detail && <span className="shrink-0 text-xs text-muted-foreground">{result.detail}</span>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          {mode === "todo" ? (
            <p id={`${listId}-hint`} role="status" className={cn("px-4 py-3 text-sm", todoError ? "text-destructive" : "text-muted-foreground")}>
              {todoError || "Enter adds it to Today’s to-dos. Backspace on an empty line goes back."}
            </p>
          ) : (
            <p role="status" className="px-4 pb-3 text-sm text-muted-foreground empty:hidden">
              {loading ? "Searching…" : !short && flat.length === 0 ? `Nothing matches “${query.trim()}”.` : ""}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Puts every page you can name on ⌘K's recent list as you visit it. Separate from the palette
 * because reading the path needs a Suspense boundary; the layout gives it one.
 */
export function RememberPage() {
  const pathname = usePathname();
  useEffect(() => {
    const page = pageAt(pathname);
    if (!page) return;
    try {
      localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(rememberPage(readRecent(), page)));
    } catch {
      // Storage blocked (private mode): there's just no recent list.
    }
  }, [pathname]);
  return null;
}

