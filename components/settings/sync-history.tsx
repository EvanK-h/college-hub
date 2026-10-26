import { Card } from "@/components/ui/card";
import { SyncStatusBadge } from "@/components/settings/sync-status-badge";
import { describeCounts, formatDuration, formatRunTime, type SyncRun } from "@/lib/sync/format";

export function SyncHistory({ runs, timeZone }: { runs: SyncRun[]; timeZone: string }) {
  if (runs.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing has run yet.</p>;
  }

  return (
    <Card>
      {/* Scrolls sideways inside the card on a narrow screen instead of widening the page. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-md text-left text-sm">
          <thead>
            <tr className="text-xs font-semibold tracking-wide text-tertiary-foreground uppercase">
              <th scope="col" className="px-(--card-spacing) pb-2 font-semibold">When</th>
              <th scope="col" className="pr-4 pb-2 font-semibold">Result</th>
              <th scope="col" className="pr-4 pb-2 font-semibold">Changes</th>
              <th scope="col" className="pr-(--card-spacing) pb-2 text-right font-semibold">Took</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id} className="border-t border-separator align-top">
                <td className="px-(--card-spacing) py-2.5 whitespace-nowrap">
                  <time dateTime={run.started_at}>{formatRunTime(run.started_at, timeZone)}</time>
                </td>
                <td className="py-2.5 pr-4">
                  <SyncStatusBadge status={run.status} />
                  {run.error_message && (
                    <p className="mt-0.5 max-w-xs text-xs text-muted-foreground">{run.error_message}</p>
                  )}
                </td>
                <td className="py-2.5 pr-4 text-muted-foreground">
                  {run.status === "running" ? "—" : describeCounts(run)}
                </td>
                <td className="py-2.5 pr-(--card-spacing) text-right whitespace-nowrap text-muted-foreground tabular-nums">
                  {formatDuration(run.started_at, run.finished_at) ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
