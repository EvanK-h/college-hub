import { CircleCheck, CircleDot, CircleX, KeyRound } from "lucide-react";
import { SYNC_STATUS_LABELS, type SyncStatus } from "@/lib/sync/format";
import { cn } from "@/lib/utils";

// Each status has its own shape as well as its colour, so none of them relies on colour alone.
// Success and in-progress reuse the course status hues; both failures use the overdue red.
const STATUS_ICONS: Record<SyncStatus, { Icon: typeof CircleCheck; tone: string }> = {
  running: { Icon: CircleDot, tone: "text-status-in-progress" },
  success: { Icon: CircleCheck, tone: "text-status-done" },
  error: { Icon: CircleX, tone: "text-status-overdue" },
  token_expired: { Icon: KeyRound, tone: "text-status-overdue" },
};

export function SyncStatusIcon({ status, className }: { status: SyncStatus; className?: string }) {
  const { Icon, tone } = STATUS_ICONS[status];
  return <Icon aria-hidden className={cn("shrink-0", tone, className)} />;
}

export function SyncStatusBadge({ status }: { status: SyncStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-medium">
      <SyncStatusIcon status={status} className="size-4" />
      {SYNC_STATUS_LABELS[status]}
    </span>
  );
}
