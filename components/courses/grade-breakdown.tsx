import type { GradeContribution } from "@/lib/grades/calculator";

// Where the grade comes from. Each group gets a slot as wide as its share of the grade, filled as
// far as the group scores, so the empty part of a slot is the marks lost there. The list under it
// carries the same numbers in words; the bar is drawing only. Neutral on purpose: category hues
// mean course types, and status hues mean states.
export function GradeBreakdown({ parts }: { parts: GradeContribution[] }) {
  if (parts.length < 2) return null;
  const percent = (value: number) => `${value.toFixed(value >= 10 ? 0 : 1)}%`;

  return (
    <div className="flex flex-col gap-2">
      <div aria-hidden className="flex h-2 gap-0.5">
        {parts.map((part) => (
          <span key={part.id} className="relative overflow-hidden rounded-full bg-fill" style={{ flexBasis: `${part.share}%` }}>
            <span
              className="absolute inset-y-0 left-0 rounded-full bg-foreground/65"
              style={{ width: `${Math.min(100, (part.points / part.share) * 100)}%` }}
            />
          </span>
        ))}
      </div>
      <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 text-[0.8125rem]">
        {parts.map((part) => (
          <div key={part.id} className="contents">
            <dt className="truncate text-muted-foreground" title={part.name}>
              {part.name}
            </dt>
            <dd className="text-right tabular-nums">
              {percent((part.points / part.share) * 100)}
              <span className="text-tertiary-foreground"> of {percent(part.share)}</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
