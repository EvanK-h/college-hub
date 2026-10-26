import { KeyRound } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { formatRunTime } from "@/lib/sync/format";
import { cn } from "@/lib/utils";

// Shown while the latest sync says Canvas rejected the token. Canvas tokens last 30 days at NU
// London, so this will happen monthly; it explains the fix instead of just failing quietly.
export function TokenExpiredBanner({
  detectedAt,
  timeZone,
  settingsUrl,
}: {
  detectedAt: string;
  timeZone: string;
  /** Canvas's settings page, or null when it can't be worked out. */
  settingsUrl: string | null;
}) {
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-2xl bg-destructive/10 p-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        <KeyRound aria-hidden className="mt-0.5 size-5 shrink-0 text-destructive" />
        <div className="flex flex-col gap-1">
          <p className="text-headline text-destructive">Canvas token expired</p>
          <p className="text-sm">
            Canvas rejected the token at <time dateTime={detectedAt}>{formatRunTime(detectedAt, timeZone)}</time>, so
            nothing is syncing. Create a new access token in Canvas, update <code className="font-mono">CANVAS_TOKEN</code>{" "}
            in Vercel and in <code className="font-mono">.env.local</code>, redeploy, then press Sync now.
          </p>
        </div>
      </div>
      {settingsUrl && (
        <a
          href={settingsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: "outline" }), "shrink-0 self-start")}
        >
          Open Canvas settings
        </a>
      )}
    </div>
  );
}
