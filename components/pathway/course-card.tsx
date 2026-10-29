import { EditCourseDialog, type CourseDetails } from "@/components/pathway/edit-course-dialog";
import { StatusIcon } from "@/components/pathway/status-icon";
import { categoryClass } from "@/lib/setup/setup";
import { cn } from "@/lib/utils";
import type { PathwayCourse } from "@/lib/pathway/summarize";

// The card sits inside a button (the dialog trigger), so it uses spans: a button can only
// contain phrasing content. Cards in finished terms sit flat (no shadow) so the plan reads as a
// timeline: what is behind you recedes. The bar alone marks the course type; a tinted fill made
// the board read pink (CS core is most of the plan) and maroon in dark mode.
export function CourseCard({
  course,
  termId,
  terms,
  past = false,
  checkTerm,
  details,
  creditUnit,
}: {
  course: PathwayCourse;
  termId: number;
  terms: { id: number; name: string }[];
  past?: boolean;
  creditUnit: string;
  /** Problems with moving this course to a term, shown in the dialog as the term is changed. */
  checkTerm?: (termId: number) => string[];
  details?: CourseDetails;
}) {
  return (
    <EditCourseDialog course={{ ...course, termId }} terms={terms} checkTerm={checkTerm} details={details}>
      <CourseCardBody course={course} past={past} creditUnit={creditUnit} />
    </EditCourseDialog>
  );
}

/** The card without the edit dialog, for boards that don't edit real courses (what-if plans). */
export function CourseCardBody({
  course,
  past = false,
  label,
  creditUnit,
  className,
}: {
  course: PathwayCourse;
  past?: boolean;
  label?: string;
  creditUnit: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex items-stretch gap-3 rounded-xl bg-card p-3 text-card-foreground transition-shadow",
        past ? "ring-1 ring-separator group-hover/course:shadow-card" : "shadow-card group-hover/course:shadow-raised",
        className,
        categoryClass(course.type.color),
      )}
    >
      <span className="w-1 shrink-0 rounded-full bg-(--course) contrast-more:w-1.5" aria-hidden />
      <span className="block min-w-0 flex-1">
        <span className="block text-sm font-semibold">{course.code}</span>
        <span className="mt-0.5 block text-[0.8125rem] leading-snug text-muted-foreground">{course.title}</span>
        <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span className="text-tertiary-foreground tabular-nums">{course.credits} {creditUnit}</span>
          {label && <span className="rounded-full bg-accent px-1.5 py-px font-medium text-accent-foreground">{label}</span>}
        </span>
      </span>
      <StatusIcon status={course.status} className="mt-0.5 size-4 shrink-0" />
    </span>
  );
}
