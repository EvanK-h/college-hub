import type { ReactNode, Ref } from "react";
import { ChevronRight } from "lucide-react";
import { StatusIcon } from "@/components/pathway/status-icon";
import { cn } from "@/lib/utils";
import type { TermSummary } from "@/lib/pathway/summarize";

// Phase drives wayfinding: finished terms recede (no tint, flat cards), the current term is
// outlined in the in-progress colour and labelled, so colour is never the only cue.
// While a course is dragged over it, the column shows whether the drop is clean (`drop="ok"`) or
// would cause problems (`drop="problem"`, with `notice` saying what).
//
// With `onToggle`, the name is a disclosure button and `collapsed` narrows the column to a
// summary ("13 courses · 53 SH"), so finished terms leave room for the ones ahead. With `limit`,
// the credit total becomes a meter against the profile's limit for the term's kind.
export function TermColumn({
  term,
  children,
  ref,
  drop = null,
  notice,
  creditUnit,
  limit,
  collapsed = false,
  onToggle,
}: {
  term: TermSummary;
  creditUnit: string;
  children: ReactNode;
  ref?: Ref<HTMLLIElement>;
  drop?: "ok" | "problem" | null;
  notice?: ReactNode;
  limit?: number;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const past = term.phase === "past";
  const current = term.phase === "current";
  const over = limit !== undefined && term.totalSh > limit;
  const allDone = term.courses.length > 0 && term.courses.every((course) => course.status === "done");
  const name = <span className={cn("text-headline", past && "text-muted-foreground")}>{term.name}</span>;

  return (
    <li
      ref={ref}
      aria-current={current ? "step" : undefined}
      className={cn(
        "flex shrink-0 snap-start flex-col gap-2.5 rounded-2xl p-2.5 transition-shadow",
        collapsed ? "w-44" : "w-64",
        past ? "ring-1 ring-separator ring-inset" : "bg-fill-tertiary",
        current && "ring-2 ring-status-in-progress/45 ring-inset contrast-more:ring-status-in-progress",
        drop === "ok" && "ring-2 ring-primary ring-inset",
        drop === "problem" && "ring-2 ring-destructive ring-inset",
      )}
    >
      <div className="flex flex-col gap-1 px-1.5 pt-1">
        <h2 className="min-w-0">
          {onToggle ? (
            <button
              type="button"
              aria-expanded={!collapsed}
              onClick={onToggle}
              className="-mx-1 flex items-center gap-1 rounded-md px-1 text-left hover:bg-fill-secondary focus-visible:outline-2 focus-visible:outline-ring"
            >
              <ChevronRight aria-hidden className={cn("size-4 shrink-0 text-tertiary-foreground transition-transform", !collapsed && "rotate-90")} />
              {name}
            </button>
          ) : (
            name
          )}
        </h2>
        {/* The credit load on its own line under the name, so a long term name never pushes it
            onto a second row and every column's meter lines up. */}
        {!collapsed && (
          <div className="flex items-center gap-2">
            {limit !== undefined && (
              <span aria-hidden className="block h-1 flex-1 overflow-hidden rounded-full bg-fill">
                <span
                  className={cn("block h-full rounded-full", over ? "bg-status-overdue" : "bg-tertiary-foreground")}
                  style={{ width: `${Math.min(term.totalSh / limit, 1) * 100}%` }}
                />
              </span>
            )}
            <span className={cn("shrink-0 text-xs tabular-nums", over ? "font-semibold text-status-overdue" : "text-muted-foreground")}>
              {term.totalSh}
              {limit !== undefined && ` / ${limit}`} {creditUnit}
              {over && <span className="sr-only">, over the limit</span>}
            </span>
          </div>
        )}
        {collapsed && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
            {allDone && <StatusIcon status="done" className="size-3.5" />}
            {term.courses.length} {term.courses.length === 1 ? "course" : "courses"} · {term.totalSh} {creditUnit}
          </p>
        )}
      </div>
      {(current || term.kind === "coop") && (
        <div className="flex flex-wrap gap-1.5 px-1.5">
          {current && (
            <p className="rounded-full bg-status-in-progress px-2.5 py-0.5 text-xs font-semibold text-card">
              Current term
            </p>
          )}
          {term.kind === "coop" && (
            <p className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">Co-op term</p>
          )}
        </div>
      )}
      {notice}
      {!collapsed && <ul className="flex flex-col gap-2">{children}</ul>}
    </li>
  );
}
