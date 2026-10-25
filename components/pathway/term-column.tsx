import { CourseCard } from "@/components/pathway/course-card";
import type { TermSummary } from "@/lib/pathway/summarize";

export function TermColumn({ term }: { term: TermSummary }) {
  return (
    <li className="w-60 shrink-0">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">{term.name}</h2>
        <span className="text-xs text-muted-foreground">{term.totalSh} SH</span>
      </div>
      {term.kind === "coop" && (
        <p className="mb-2 rounded-md bg-accent px-2 py-1 text-xs font-medium text-accent-foreground">Co-op term</p>
      )}
      <ul className="flex flex-col gap-2">
        {term.courses.map((course) => (
          <li key={course.id}>
            <CourseCard course={course} />
          </li>
        ))}
      </ul>
    </li>
  );
}
