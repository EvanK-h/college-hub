import { EditCourseDialog } from "@/components/pathway/edit-course-dialog";
import { StatusIcon } from "@/components/pathway/status-icon";
import { cn } from "@/lib/utils";
import type { CourseType } from "@/lib/pathway/labels";
import type { PathwayCourse } from "@/lib/pathway/summarize";

// Sets `--course` to the type's colour, so the bar, the card tint and the legend dot all read one
// variable. Tailwind only generates classes it can find as whole strings, so each type is spelled out.
export const COURSE_TYPE_COLOR: Record<CourseType, string> = {
  cs_core: "[--course:var(--course-cs-core)]",
  ai_concentration: "[--course:var(--course-ai-concentration)]",
  physics_minor: "[--course:var(--course-physics-minor)]",
  major_support: "[--course:var(--course-major-support)]",
  general_elective: "[--course:var(--course-general-elective)]",
  coop_program: "[--course:var(--course-coop-program)]",
};

// The card sits inside a button (the dialog trigger), so it uses spans: a button can only
// contain phrasing content. Cards in finished terms sit flat (no shadow) so the plan reads as a
// timeline: what is behind you recedes.
export function CourseCard({
  course,
  termId,
  terms,
  past = false,
  checkTerm,
}: {
  course: PathwayCourse;
  termId: number;
  terms: { id: number; name: string }[];
  past?: boolean;
  /** Problems with moving this course to a term, shown in the dialog as the term is changed. */
  checkTerm?: (termId: number) => string[];
}) {
  return (
    <EditCourseDialog course={{ ...course, termId }} terms={terms} checkTerm={checkTerm}>
      <CourseCardBody course={course} past={past} />
    </EditCourseDialog>
  );
}

/** The card without the edit dialog, for boards that don't edit real courses (what-if plans). */
export function CourseCardBody({ course, past = false, label }: { course: PathwayCourse; past?: boolean; label?: string }) {
  return (
    <span
      className={cn(
        "flex items-stretch gap-3 rounded-xl bg-[color-mix(in_oklch,var(--course)_4%,var(--card))] p-3 text-card-foreground transition-shadow",
        past ? "ring-1 ring-separator group-hover/course:shadow-card" : "shadow-card group-hover/course:shadow-raised",
        COURSE_TYPE_COLOR[course.type],
      )}
    >
      <span className="w-1 shrink-0 rounded-full bg-(--course) contrast-more:w-1.5" aria-hidden />
      <span className="block min-w-0 flex-1">
        <span className="block text-sm font-semibold">{course.code}</span>
        <span className="mt-0.5 block text-[0.8125rem] leading-snug text-muted-foreground">{course.title}</span>
        <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span className="text-tertiary-foreground tabular-nums">{course.credits} SH</span>
          {label && <span className="rounded-full bg-accent px-1.5 py-px font-medium text-accent-foreground">{label}</span>}
        </span>
      </span>
      <StatusIcon status={course.status} className="mt-0.5 size-4 shrink-0" />
    </span>
  );
}
