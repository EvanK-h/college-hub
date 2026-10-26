import { CourseCard } from "@/components/pathway/course-card";
import { cn } from "@/lib/utils";
import type { TermSummary } from "@/lib/pathway/summarize";

// Phase drives wayfinding: finished terms recede (no tint, flat cards), the current term is
// outlined in the in-progress colour and labelled, so colour is never the only cue.
export function TermColumn({ term, terms }: { term: TermSummary; terms: { id: number; name: string }[] }) {
  const past = term.phase === "past";
  const current = term.phase === "current";

  return (
    <li
      aria-current={current ? "step" : undefined}
      className={cn(
        "flex w-64 shrink-0 snap-start flex-col gap-2.5 rounded-2xl p-2.5",
        past ? "ring-1 ring-separator ring-inset" : "bg-fill-tertiary",
        current && "ring-2 ring-status-in-progress/45 ring-inset contrast-more:ring-status-in-progress",
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
      <ul className="flex flex-col gap-2">
        {term.courses.map((course) => (
          <li key={course.id}>
            <CourseCard course={course} termId={term.id} terms={terms} past={past} />
          </li>
        ))}
      </ul>
    </li>
  );
}
