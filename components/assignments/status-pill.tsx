import { AlarmClock, Circle, CircleAlert, CircleCheck, CircleDot, CircleMinus } from "lucide-react";
import { ASSIGNMENT_STATUS_LABELS, type AssignmentStatus } from "@/lib/assignments/status";
import { cn } from "@/lib/utils";

// The status palette from the spec's Visual design section. Each status has its own icon shape
// and a text label, so none relies on colour alone. The label stays in the text colour for
// contrast on the tinted fill; the icon and outline carry the hue. Done is the only filled pill,
// so finished and not-started work never read alike. Missed shares not started's neutral outline
// and is told apart by its icon and label.
const STATUS_STYLE: Record<AssignmentStatus, { Icon: typeof Circle; pill: string; icon: string }> = {
  done: {
    Icon: CircleCheck,
    pill: "bg-[color-mix(in_oklch,var(--status-done)_16%,var(--card))]",
    icon: "text-status-done",
  },
  missed: { Icon: CircleMinus, pill: "ring-1 ring-border ring-inset text-muted-foreground", icon: "text-status-planned" },
  overdue: { Icon: CircleAlert, pill: "ring-1 ring-status-overdue ring-inset", icon: "text-status-overdue" },
  due_soon: { Icon: AlarmClock, pill: "ring-1 ring-status-due-soon ring-inset", icon: "text-status-due-soon" },
  in_progress: { Icon: CircleDot, pill: "ring-1 ring-status-in-progress ring-inset", icon: "text-status-in-progress" },
  not_started: { Icon: Circle, pill: "ring-1 ring-border ring-inset text-muted-foreground", icon: "text-status-planned" },
};

export function StatusPill({ status, className }: { status: AssignmentStatus; className?: string }) {
  const { Icon, pill, icon } = STATUS_STYLE[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        pill,
        className,
      )}
    >
      <Icon aria-hidden className={cn("size-3.5", icon)} />
      {ASSIGNMENT_STATUS_LABELS[status]}
    </span>
  );
}
