import { Card, CardContent } from "@/components/ui/card";
import { SyncStatusIcon } from "@/components/settings/sync-status-badge";
import { describeLatestRun, type SyncRun } from "@/lib/sync/format";

// One source's latest run in one glance. `now` is passed in so the relative times are computed once per render.
export function SyncCard({
  label,
  latest,
  lastSuccess,
  now,
  emptyHint,
}: {
  label: string;
  latest: SyncRun | null;
  lastSuccess: SyncRun | null;
  now: Date;
  emptyHint?: string;
}) {
  const { headline, details } = describeLatestRun(latest, lastSuccess, now, emptyHint);

  return (
    <Card>
      <CardContent className="flex flex-col gap-1">
        <p className="text-xs font-semibold tracking-wide text-tertiary-foreground uppercase">{label}</p>
        <p className="flex items-center gap-2 text-headline">
          {latest && <SyncStatusIcon status={latest.status} className="size-5" />}
          {headline}
        </p>
        {details.map((line) => (
          <p key={line} className="text-sm text-muted-foreground">
            {line}
          </p>
        ))}
      </CardContent>
    </Card>
  );
}
