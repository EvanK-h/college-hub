"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, FileText, LayoutGrid, Megaphone, Search } from "lucide-react";
import { search } from "@/app/(app)/actions";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { matchPages, MIN_QUERY_LENGTH, SEARCH_KIND_LABELS, type SearchKind, type SearchResult } from "@/lib/search/search";
import { cn } from "@/lib/utils";

const KIND_ICONS: Record<SearchKind, typeof Search> = { page: LayoutGrid, course: BookOpen, assignment: FileText, announcement: Megaphone };
const KIND_ORDER: SearchKind[] = ["page", "course", "assignment", "announcement"];
const DEBOUNCE_MS = 150;

// Global search: ⌘K (Ctrl+K elsewhere) or the header button opens it. Pages match as you type;
// courses, assignments and announcements come from the server. Arrow keys move through the
// results and Enter opens one. It follows the ARIA combobox pattern: focus stays in the input
// and aria-activedescendant points at the highlighted option, so screen readers announce it.
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [remote, setRemote] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const latest = useRef(0);
  const router = useRouter();
  const listId = useId();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Ask the server after a short pause in typing; a slow answer to an older query is dropped.
  useEffect(() => {
    if (query.trim().length < MIN_QUERY_LENGTH) return;
    const request = ++latest.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      const found = await search(query).catch(() => []);
      if (request !== latest.current) return;
      setRemote(found);
      setLoading(false);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const short = query.trim().length < MIN_QUERY_LENGTH;
  const results = [...matchPages(query), ...(short ? [] : remote)];
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
    setQuery("");
    setRemote([]);
    setLoading(false);
    setActive(0);
  }

  function go(result: SearchResult | undefined) {
    if (!result) return;
    setOpen(false);
    reset();
    router.push(result.href);
  }

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
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
        onClick={() => setOpen(true)}
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
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogContent className="gap-0 overflow-hidden p-0 sm:top-[12vh] sm:max-w-lg sm:translate-y-0" showCloseButton={false}>
          <DialogTitle className="sr-only">Search</DialogTitle>
          <div className="flex items-center gap-2 border-b border-separator px-4">
            <Search aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            <input
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
              aria-label="Search courses, assignments, announcements and pages"
              placeholder="Search courses, assignments, announcements…"
              className="h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-tertiary-foreground"
            />
          </div>

          <div id={listId} role="listbox" aria-label="Results" className="max-h-[min(60vh,26rem)] overflow-y-auto p-2 empty:hidden">
            {groups.map((group) => (
              <div key={group.kind} role="group" aria-labelledby={`${listId}-${group.kind}`} className="pb-1">
                <p id={`${listId}-${group.kind}`} className="px-2 pt-2 pb-1 text-xs font-semibold text-muted-foreground">
                  {SEARCH_KIND_LABELS[group.kind]}
                </p>
                {group.items.map(({ result, position: current }) => {
                  const Icon = KIND_ICONS[result.kind];
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
          <p role="status" className="px-4 pb-3 text-sm text-muted-foreground empty:hidden">
            {loading ? "Searching…" : !short && flat.length === 0 ? `Nothing matches “${query.trim()}”.` : ""}
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
