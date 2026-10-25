import { EditCourseDialog } from "@/components/pathway/edit-course-dialog";
import { StatusIcon } from "@/components/pathway/status-icon";
import { cn } from "@/lib/utils";
import type { CourseType } from "@/lib/pathway/labels";
import type { PathwayCourse } from "@/lib/pathway/summarize";

// Tailwind only generates classes it can find as whole strings, so each type is spelled out.
export const COURSE_TYPE_BORDER: Record<CourseType, string> = {
  cs_core: "border-l-course-cs-core",
  ai_concentration: "border-l-course-ai-concentration",
  physics_minor: "border-l-course-physics-minor",
  major_support: "border-l-course-major-support",
  general_elective: "border-l-course-general-elective",
  coop_program: "border-l-course-coop-program",
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
      <span
        className={cn(
          "flex items-start gap-2 rounded-md border border-l-4 bg-card p-2 text-card-foreground hover:bg-accent/40",
          COURSE_TYPE_BORDER[course.type],
        )}
      >
        <span className="block min-w-0 flex-1">
          <span className="block text-sm font-medium">{course.code}</span>
          <span className="block text-xs text-muted-foreground">{course.title}</span>
          <span className="mt-1 block text-xs text-muted-foreground">{course.credits} SH</span>
        </span>
        <StatusIcon status={course.status} className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      </span>
    </EditCourseDialog>
  );
}
