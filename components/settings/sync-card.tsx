import { Card, CardContent } from "@/components/ui/card";
import { SyncStatusIcon } from "@/components/settings/sync-status-badge";
import { describeLatestRun, type SyncRun } from "@/lib/sync/format";

// The latest run in one glance. `now` is passed in so the relative times are computed once per render.
export function SyncCard({
  latest,
  lastSuccess,
  now,
}: {
  latest: SyncRun | null;
  lastSuccess: SyncRun | null;
  now: Date;
}) {
  const { headline, details } = describeLatestRun(latest, lastSuccess, now);

  return (
    <Card>
      <CardContent className="flex flex-col gap-1">
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
