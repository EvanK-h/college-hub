import type { RingCounts } from "@/lib/pathway/areas";

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// A donut split into done, in progress and not started. The text underneath carries the same
// numbers, so the colours are never the only way to read it.
export function ProgressRing({ label, counts }: { label: string; counts: RingCounts }) {
  const { done, inProgress, notStarted, total } = counts;
  const arc = (count: number) => (total === 0 ? 0 : (count / total) * CIRCUMFERENCE);

  return (
    <figure className="flex flex-col items-center gap-2 rounded-xl bg-card p-3 text-center ring-1 ring-foreground/10">
      <div className="relative size-24">
        <svg viewBox="0 0 100 100" aria-hidden className="size-full -rotate-90 fill-none" strokeWidth={12}>
          <circle cx={50} cy={50} r={RADIUS} className="stroke-border" />
          <circle
            cx={50}
            cy={50}
            r={RADIUS}
            className="stroke-chart-1"
            strokeDasharray={`${arc(done + inProgress)} ${CIRCUMFERENCE}`}
          />
          <circle
            cx={50}
            cy={50}
            r={RADIUS}
            className="stroke-primary"
            strokeDasharray={`${arc(done)} ${CIRCUMFERENCE}`}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-lg font-semibold">
          {done}/{total}
        </span>
      </div>
      <figcaption>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">
          {done} done · {inProgress} in progress · {notStarted} not started
        </p>
      </figcaption>
    </figure>
  );
}
