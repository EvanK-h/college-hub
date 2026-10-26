import type { RingCounts } from "@/lib/pathway/areas";

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Draws in from empty on load (`ring-draw` in globals.css); reduced motion makes that instant.
const ARC_CLASS = "animate-[ring-draw_900ms_var(--ease-spring)_both]";

// A donut split into done, in progress and not started. The text underneath carries the same
// numbers, so the colours are never the only way to read it.
export function ProgressRing({ label, counts }: { label: string; counts: RingCounts }) {
  const { done, inProgress, notStarted, total } = counts;
  const arc = (count: number) => (total === 0 ? 0 : (count / total) * CIRCUMFERENCE);

  return (
    <figure className="flex h-full flex-col items-center gap-3 rounded-2xl bg-card p-4 text-center shadow-card">
      <div className="relative size-24">
        <svg viewBox="0 0 100 100" aria-hidden className="size-full -rotate-90 fill-none" strokeWidth={10}>
          <circle cx={50} cy={50} r={RADIUS} className="stroke-fill" />
          {/* Round caps would show a zero-length arc as a dot, so empty arcs are not drawn. */}
          {done + inProgress > 0 && (
            <circle
              cx={50}
              cy={50}
              r={RADIUS}
              strokeLinecap="round"
              className={`stroke-status-in-progress ${ARC_CLASS}`}
              strokeDasharray={`${arc(done + inProgress)} ${CIRCUMFERENCE}`}
            />
          )}
          {done > 0 && (
            <circle
              cx={50}
              cy={50}
              r={RADIUS}
              strokeLinecap="round"
              className={`stroke-status-done ${ARC_CLASS}`}
              strokeDasharray={`${arc(done)} ${CIRCUMFERENCE}`}
            />
          )}
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-headline tabular-nums">
          {done}/{total}
        </span>
      </div>
      <figcaption>
        <p className="text-sm font-semibold">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {done} done · {inProgress} in progress · {notStarted} not started
        </p>
      </figcaption>
    </figure>
  );
}
