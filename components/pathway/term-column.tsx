import { CourseCard } from "@/components/pathway/course-card";
import type { TermSummary } from "@/lib/pathway/summarize";

// A translucent foreground tint keeps the column one step below the cards in both themes.
export function TermColumn({ term, terms }: { term: TermSummary; terms: { id: number; name: string }[] }) {
  return (
    <li className="flex w-64 shrink-0 snap-start flex-col gap-2.5 rounded-2xl bg-foreground/4 p-2.5">
      <div className="flex items-baseline justify-between gap-2 px-1.5 pt-1">
        <h2 className="text-headline">{term.name}</h2>
        <span className="text-xs text-muted-foreground tabular-nums">{term.totalSh} SH</span>
      </div>
      {term.kind === "coop" && (
        <p className="mx-1.5 self-start rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
          Co-op term
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {term.courses.map((course) => (
          <li key={course.id}>
            <CourseCard course={course} termId={term.id} terms={terms} />
          </li>
        ))}
      </ul>
    </li>
  );
}
