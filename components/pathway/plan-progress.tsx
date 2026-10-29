import type { PlanProgress } from "@/lib/pathway/progress";

// "How far am I": one line of numbers above the board, and a bar split like the requirement
// rings (done, in progress, and the track for what's planned). The text carries every number the
// bar shows, so the colours are never the only way to read it.
export function PlanProgressBar({ progress, creditUnit }: { progress: PlanProgress; creditUnit: string }) {
  const { done, inProgress, total, finalTerm, termsLeft } = progress;
  if (total === 0) return null;
  const width = (credits: number) => `${(credits / total) * 100}%`;

  return (
    <section aria-label="Degree progress" className="flex flex-col gap-2">
      <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <span>
          <span className="font-semibold text-foreground tabular-nums">{done}</span> of <span className="tabular-nums">{total}</span> {creditUnit} done
        </span>
        {inProgress > 0 && (
          <span>
            <span className="tabular-nums">{inProgress}</span> in progress
          </span>
        )}
        {termsLeft > 0 && (
          <span>
            <span className="tabular-nums">{termsLeft}</span> {termsLeft === 1 ? "term" : "terms"} left
          </span>
        )}
        {finalTerm && <span>Finishing {finalTerm}</span>}
      </p>
      <div aria-hidden className="flex h-1.5 overflow-hidden rounded-full bg-fill">
        <span className="bg-status-done" style={{ width: width(done) }} />
        <span className="bg-status-in-progress" style={{ width: width(inProgress) }} />
      </div>
    </section>
  );
}
