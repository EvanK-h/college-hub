import { Suspense } from "react";
import { redirect } from "next/navigation";
import { signOut } from "@/app/actions";
import { PAGE_CLASS, PageHeader } from "@/components/page-header";
import { CalendarFeed } from "@/components/settings/calendar-feed";
import { CourseLinks } from "@/components/settings/course-links";
import { SyncCard } from "@/components/settings/sync-card";
import { SyncHistory } from "@/components/settings/sync-history";
import { TokenExpiredBanner } from "@/components/settings/token-expired-banner";
import { SyncNowForm } from "@/components/settings/sync-now-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { canvasSettingsUrl } from "@/lib/canvas/links";
import { getTimetableFeedUrl } from "@/lib/env.server";
import { summarizeTerms } from "@/lib/pathway/summarize";
import { createClient } from "@/lib/supabase/server";

// The "Sync now" server action runs under this page's limit, so give a sync room to finish.
export const maxDuration = 60;

const HISTORY_LIMIT = 20;
const RUN_COLUMNS = "id, source, status, started_at, finished_at, inserted, updated, unchanged, error_message";

export default function SettingsPage() {
  return (
    <main className={PAGE_CLASS}>
      <PageHeader eyebrow="Account" title="Settings">
        <form action={signOut} className="mt-1">
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </PageHeader>
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <SyncSections />
      </Suspense>
      <section aria-labelledby="appearance" className="flex flex-col gap-3">
        <h2 id="appearance" className="text-title-3">
          Appearance
        </h2>
        <ThemeToggle />
        <p className="text-sm text-muted-foreground">Saved on this device. System follows your device&rsquo;s light or dark setting.</p>
      </section>
    </main>
  );
}

async function SyncSections() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  // The proxy already redirects signed-out visitors; this is a second check in case it is ever bypassed.
  if (!claims?.claims) redirect("/login");

  const latestRun = (source: "canvas" | "timetable", status?: "success") => {
    let query = supabase.from("sync_runs").select(RUN_COLUMNS).eq("source", source);
    if (status) query = query.eq("status", status);
    return query.order("started_at", { ascending: false }).limit(1).maybeSingle();
  };

  // All read with the user's session, so row-level security applies.
  const [historyResult, canvasResult, canvasSuccessResult, timetableResult, timetableSuccessResult, feedResult, termsResult] = await Promise.all([
    supabase.from("sync_runs").select(RUN_COLUMNS).order("started_at", { ascending: false }).limit(HISTORY_LIMIT),
    latestRun("canvas"),
    latestRun("canvas", "success"),
    latestRun("timetable"),
    latestRun("timetable", "success"),
    supabase.from("calendar_feeds").select("created_at").maybeSingle(),
    supabase
      .from("terms")
      .select("id, name, kind, time_zone, courses(id, code, title, credits, type, status)")
      .order("id"),
  ]);
  if (historyResult.error) throw new Error(`Loading sync history failed: ${historyResult.error.message}`);
  for (const result of [canvasResult, canvasSuccessResult, timetableResult, timetableSuccessResult, feedResult]) {
    if (result.error) throw new Error(`Loading the latest sync failed: ${result.error.message}`);
  }
  if (termsResult.error) throw new Error(`Loading terms failed: ${termsResult.error.message}`);

  const runs = historyResult.data;
  const now = new Date();

  // Times are shown in the current term's time zone. With no current term, UTC; the zone's name
  // is printed next to every time, so it is never ambiguous.
  const currentTerm = summarizeTerms(termsResult.data).find((term) => term.phase === "current");
  const timeZone = termsResult.data.find((term) => term.id === currentTerm?.id)?.time_zone ?? "UTC";

  // Only Canvas runs decide the banner: a later timetable run must not hide an expired token.
  const canvas = canvasResult.data;
  // A boolean only; the URL itself never leaves the server module.
  const timetableConfigured = getTimetableFeedUrl() !== null;

  return (
    <>
      {canvas?.status === "token_expired" && (
        <TokenExpiredBanner
          detectedAt={canvas.finished_at ?? canvas.started_at}
          timeZone={timeZone}
          settingsUrl={canvasSettingsUrl()}
        />
      )}

      <section aria-labelledby="sync-heading" className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <h2 id="sync-heading" className="text-title-3">
            Sync
          </h2>
          <SyncNowForm />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <SyncCard label="Canvas" latest={canvas} lastSuccess={canvasSuccessResult.data} now={now} />
          <SyncCard
            label="Timetable"
            latest={timetableResult.data}
            lastSuccess={timetableSuccessResult.data}
            now={now}
            emptyHint={
              timetableConfigured
                ? "The timetable syncs with Canvas; its first run will show up here."
                : "Not set up yet. Publish your Outlook calendar and set OUTLOOK_ICS_URL."
            }
          />
        </div>
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

      <section aria-labelledby="feed-heading" className="flex flex-col gap-3">
        <h2 id="feed-heading" className="text-title-3">
          Calendar feed
        </h2>
        <Card>
          <CardContent>
            <CalendarFeed
              createdOn={
                feedResult.data
                  ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone }).format(
                      new Date(feedResult.data.created_at),
                    )
                  : null
              }
            />
          </CardContent>
        </Card>
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
