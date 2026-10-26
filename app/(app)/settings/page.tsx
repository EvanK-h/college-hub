import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PAGE_CLASS, PageHeader } from "@/components/page-header";
import { CourseLinks } from "@/components/settings/course-links";
import { SyncCard } from "@/components/settings/sync-card";
import { SyncHistory } from "@/components/settings/sync-history";
import { TokenExpiredBanner } from "@/components/settings/token-expired-banner";
import { canvasSettingsUrl } from "@/lib/canvas/links";
import { summarizeTerms } from "@/lib/pathway/summarize";
import { createClient } from "@/lib/supabase/server";

// The "Sync now" server action runs under this page's limit, so give a sync room to finish.
export const maxDuration = 60;

const HISTORY_LIMIT = 20;
const RUN_COLUMNS = "id, status, started_at, finished_at, inserted, updated, unchanged, error_message";

export default function SettingsPage() {
  return (
    <main className={PAGE_CLASS}>
      <PageHeader eyebrow="Account" title="Settings" />
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <SyncSections />
      </Suspense>
    </main>
  );
}

async function SyncSections() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  // The proxy already redirects signed-out visitors; this is a second check in case it is ever bypassed.
  if (!claims?.claims) redirect("/login");

  // All three read with the user's session, so row-level security applies.
  const [historyResult, successResult, termsResult] = await Promise.all([
    supabase.from("sync_runs").select(RUN_COLUMNS).order("started_at", { ascending: false }).limit(HISTORY_LIMIT),
    supabase
      .from("sync_runs")
      .select(RUN_COLUMNS)
      .eq("status", "success")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("terms")
      .select("id, name, kind, time_zone, courses(id, code, title, credits, type, status)")
      .order("id"),
  ]);
  if (historyResult.error) throw new Error(`Loading sync history failed: ${historyResult.error.message}`);
  if (successResult.error) throw new Error(`Loading the last successful sync failed: ${successResult.error.message}`);
  if (termsResult.error) throw new Error(`Loading terms failed: ${termsResult.error.message}`);

  const runs = historyResult.data;
  const now = new Date();

  // Times are shown in the current term's time zone. With no current term, UTC; the zone's name
  // is printed next to every time, so it is never ambiguous.
  const currentTerm = summarizeTerms(termsResult.data).find((term) => term.phase === "current");
  const timeZone = termsResult.data.find((term) => term.id === currentTerm?.id)?.time_zone ?? "UTC";

  const latest = runs[0] ?? null;

  return (
    <>
      {latest?.status === "token_expired" && (
        <TokenExpiredBanner
          detectedAt={latest.finished_at ?? latest.started_at}
          timeZone={timeZone}
          settingsUrl={canvasSettingsUrl()}
        />
      )}

      <section aria-labelledby="sync-heading" className="flex flex-col gap-3">
        <h2 id="sync-heading" className="text-title-3">
          Canvas sync
        </h2>
        <SyncCard latest={latest} lastSuccess={successResult.data} now={now} />
      </section>

      <section aria-labelledby="links-heading" className="flex flex-col gap-3">
        <h2 id="links-heading" className="text-title-3">
          Course links{currentTerm ? ` · ${currentTerm.name}` : ""}
        </h2>
        {/* Its own boundary: this one calls Canvas, so a slow answer must not hold up the rest. */}
        <Suspense fallback={<p className="text-sm text-muted-foreground">Loading Canvas courses…</p>}>
          <CourseLinks term={currentTerm ? { id: currentTerm.id, name: currentTerm.name } : null} />
        </Suspense>
      </section>

      <section aria-labelledby="history-heading" className="flex flex-col gap-3">
        <h2 id="history-heading" className="text-title-3">
          History
        </h2>
        <SyncHistory runs={runs} timeZone={timeZone} />
      </section>
    </>
  );
}
