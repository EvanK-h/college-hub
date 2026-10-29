import { ringCaption, type RingCounts } from "@/lib/pathway/areas";
import { cn } from "@/lib/utils";

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Draws in from empty on the first visit (`ring-draw` in globals.css; see RingsDrawn); reduced
// motion makes that instant.
const ARC_CLASS = "animate-[ring-draw_900ms_var(--ease-spring)_both] in-data-rings-drawn:animate-none";

// A donut split into done, in progress and not started. The text beside it carries the same
// numbers ("3/9" and what's left), so the colours are never the only way to read it.
//
// `large` is a headline area: a card with the ring above its label. `small` is a row: a little
// ring with the label beside it. With `href`, the whole thing links to the area's section.
export function ProgressRing({
  label,
  counts,
  size = "large",
  href,
}: {
  label: string;
  counts: RingCounts;
  size?: "large" | "small";
  href?: string;
}) {
  const { done, total } = counts;
  const large = size === "large";
  const content = (
    <>
      <span className={cn("relative shrink-0", large ? "size-24" : "size-11")}>
        <Ring counts={counts} />
        {large && <span className="absolute inset-0 flex items-center justify-center text-headline tabular-nums">{done}/{total}</span>}
      </span>
      <span className={cn("min-w-0", large ? "text-center" : "flex-1")}>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {!large && <span className="tabular-nums">{done}/{total} · </span>}
          {ringCaption(counts)}
        </span>
      </span>
    </>
  );
  const className = cn(
    "flex h-full rounded-2xl bg-card shadow-card",
    large ? "flex-col items-center gap-3 p-4" : "items-center gap-3 px-3 py-2.5",
    href && "press hover:shadow-raised focus-visible:outline-2 focus-visible:outline-ring",
  );

  return href ? (
    <a href={href} className={className}>
      {content}
    </a>
  ) : (
    <div className={className}>{content}</div>
  );
}

function Ring({ counts }: { counts: RingCounts }) {
  const { done, inProgress, total } = counts;
  const arc = (count: number) => (total === 0 ? 0 : (count / total) * CIRCUMFERENCE);

  return (
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
  );
}
