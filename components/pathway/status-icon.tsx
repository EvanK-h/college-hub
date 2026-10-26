import { Circle, CircleCheck, CircleDot } from "lucide-react";
import { COURSE_STATUS_LABELS, type CourseStatus } from "@/lib/pathway/labels";
import { cn } from "@/lib/utils";

const STATUS_ICONS: Record<CourseStatus, typeof Circle> = {
  planned: Circle,
  in_progress: CircleDot,
  done: CircleCheck,
};

// The shape already tells the states apart; the status colours (see globals.css) make them scannable.
const STATUS_TONE: Record<CourseStatus, string> = {
  planned: "text-status-planned",
  in_progress: "text-status-in-progress",
  done: "text-status-done",
};

// The icon is decorative; the hidden text is what screen readers announce.
export function StatusIcon({ status, className }: { status: CourseStatus; className?: string }) {
  const Icon = STATUS_ICONS[status];
  return (
    <>
      <Icon aria-hidden className={cn(STATUS_TONE[status], className)} />
      <span className="sr-only">{COURSE_STATUS_LABELS[status]}</span>
    </>
  );
}
