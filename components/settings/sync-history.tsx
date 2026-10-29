import { Card } from "@/components/ui/card";
import { SyncStatusBadge } from "@/components/settings/sync-status-badge";
import { cn } from "@/lib/utils";
import { describeCounts, formatDuration, formatRunTime, SYNC_SOURCE_LABELS, type SyncRun } from "@/lib/sync/format";

// How many runs show before "Show all".
const SHOWN = 5;

// The latest runs first; older ones fold away. "Show all" is a checkbox drawn as a button: the
// older rows hide with CSS until it's checked, so it needs no client code.
export function SyncHistory({ runs, timeZone }: { runs: SyncRun[]; timeZone: string }) {
  if (runs.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing has run yet.</p>;
  }

  return (
    <Card className="group/history">
      {/* Scrolls sideways inside the card on a narrow screen instead of widening the page. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-md text-left text-sm">
          <thead>
            <tr className="text-xs text-tertiary-foreground">
              <th scope="col" className="px-(--card-spacing) pb-2 font-semibold">When</th>
              <th scope="col" className="pr-4 pb-2 font-semibold">Source</th>
              <th scope="col" className="pr-4 pb-2 font-semibold">Result</th>
              <th scope="col" className="pr-4 pb-2 font-semibold">Changes</th>
              <th scope="col" className="pr-(--card-spacing) pb-2 text-right font-semibold">Took</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run, index) => (
              <tr key={run.id} className={cn("border-t border-separator align-top", index >= SHOWN && "hidden group-has-[#history-all:checked]/history:table-row")}>
                <td className="px-(--card-spacing) py-2.5 whitespace-nowrap">
                  <time dateTime={run.started_at}>{formatRunTime(run.started_at, timeZone)}</time>
                </td>
                <td className="py-2.5 pr-4 text-muted-foreground">{SYNC_SOURCE_LABELS[run.source]}</td>
                <td className="py-2.5 pr-4">
                  <SyncStatusBadge status={run.status} />
                  {run.error_message && (
                    <p className="mt-0.5 max-w-xs text-footnote text-muted-foreground">{run.error_message}</p>
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
      {runs.length > SHOWN && (
        <label className="mx-(--card-spacing) flex w-max cursor-pointer items-center gap-1 rounded-md text-sm font-medium text-primary has-focus-visible:outline-2 has-focus-visible:outline-ring">
          <input id="history-all" type="checkbox" className="peer sr-only" />
          <span className="peer-checked:hidden">Show all {runs.length} runs</span>
          <span className="hidden peer-checked:inline">Show the latest {SHOWN}</span>
        </label>
      )}
    </Card>
  );
}
