import { Circle, CircleCheck, CircleDot } from "lucide-react";
import { COURSE_STATUS_LABELS, type CourseStatus } from "@/lib/pathway/labels";

const STATUS_ICONS: Record<CourseStatus, typeof Circle> = {
  planned: Circle,
  in_progress: CircleDot,
  done: CircleCheck,
};

// The icon is decorative; the hidden text is what screen readers announce.
export function StatusIcon({ status, className }: { status: CourseStatus; className?: string }) {
  const Icon = STATUS_ICONS[status];
  return (
    <>
      <Icon aria-hidden className={className} />
      <span className="sr-only">{COURSE_STATUS_LABELS[status]}</span>
    </>
  );
}
