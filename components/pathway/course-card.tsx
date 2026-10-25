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

export function CourseCard({ course }: { course: PathwayCourse }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md border border-l-4 bg-card p-2 text-card-foreground",
        COURSE_TYPE_BORDER[course.type],
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{course.code}</p>
        <p className="text-xs text-muted-foreground">{course.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{course.credits} SH</p>
      </div>
      <StatusIcon status={course.status} className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
    </div>
  );
}
