import { EditCourseDialog } from "@/components/pathway/edit-course-dialog";
import { StatusIcon } from "@/components/pathway/status-icon";
import { cn } from "@/lib/utils";
import type { CourseType } from "@/lib/pathway/labels";
import type { PathwayCourse } from "@/lib/pathway/summarize";

// Tailwind only generates classes it can find as whole strings, so each type is spelled out.
export const COURSE_TYPE_SWATCH: Record<CourseType, string> = {
  cs_core: "bg-course-cs-core",
  ai_concentration: "bg-course-ai-concentration",
  physics_minor: "bg-course-physics-minor",
  major_support: "bg-course-major-support",
  general_elective: "bg-course-general-elective",
  coop_program: "bg-course-coop-program",
};

// The card sits inside a button (the dialog trigger), so it uses spans: a button can only
// contain phrasing content.
export function CourseCard({
  course,
  termId,
  terms,
}: {
  course: PathwayCourse;
  termId: number;
  terms: { id: number; name: string }[];
}) {
  return (
    <EditCourseDialog course={{ ...course, termId }} terms={terms}>
      <span className="flex items-stretch gap-3 rounded-xl bg-card p-3 text-card-foreground shadow-card transition-shadow group-hover/course:shadow-raised">
        <span className={cn("w-1 shrink-0 rounded-full", COURSE_TYPE_SWATCH[course.type])} aria-hidden />
        <span className="block min-w-0 flex-1">
          <span className="block text-sm font-semibold">{course.code}</span>
          <span className="mt-0.5 block text-[0.8125rem] leading-snug text-muted-foreground">{course.title}</span>
          <span className="mt-1.5 block text-xs text-muted-foreground tabular-nums">{course.credits} SH</span>
        </span>
        <StatusIcon status={course.status} className="mt-0.5 size-4 shrink-0" />
      </span>
    </EditCourseDialog>
  );
}
