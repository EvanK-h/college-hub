import type { ReactNode, Ref } from "react";
import { cn } from "@/lib/utils";
import type { TermSummary } from "@/lib/pathway/summarize";

// Phase drives wayfinding: finished terms recede (no tint, flat cards), the current term is
// outlined in the in-progress colour and labelled, so colour is never the only cue.
// While a course is dragged over it, the column shows whether the drop is clean (`drop="ok"`) or
// would cause problems (`drop="problem"`, with `notice` saying what).
export function TermColumn({
  term,
  children,
  ref,
  drop = null,
  notice,
}: {
  term: TermSummary;
  children: ReactNode;
  ref?: Ref<HTMLLIElement>;
  drop?: "ok" | "problem" | null;
  notice?: ReactNode;
}) {
  const past = term.phase === "past";
  const current = term.phase === "current";

  return (
    <li
      ref={ref}
      aria-current={current ? "step" : undefined}
      className={cn(
        "flex w-64 shrink-0 snap-start flex-col gap-2.5 rounded-2xl p-2.5 transition-shadow",
        past ? "ring-1 ring-separator ring-inset" : "bg-fill-tertiary",
        current && "ring-2 ring-status-in-progress/45 ring-inset contrast-more:ring-status-in-progress",
        drop === "ok" && "ring-2 ring-primary ring-inset",
        drop === "problem" && "ring-2 ring-destructive ring-inset",
      )}
    >
      <div className="flex items-baseline justify-between gap-2 px-1.5 pt-1">
        <h2 className={cn("text-headline", past && "text-muted-foreground")}>{term.name}</h2>
        <span className="text-xs text-muted-foreground tabular-nums">{term.totalSh} SH</span>
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
      <ul className="flex flex-col gap-2">{children}</ul>
    </li>
  );
}
