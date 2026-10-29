import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { signOut } from "@/app/actions";
import { PAGE_CLASS, PageHeader } from "@/components/page-header";
import { CalendarFeed } from "@/components/settings/calendar-feed";
import { CourseLinks } from "@/components/settings/course-links";
import { SyncCard } from "@/components/settings/sync-card";
import { SyncHistory } from "@/components/settings/sync-history";
import { TokenExpiredBanner } from "@/components/settings/token-expired-banner";
import { SyncNowForm } from "@/components/settings/sync-now-form";
import { CourseLinksSkeleton, SettingsSkeleton } from "@/components/skeletons";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { canvasSettingsUrl } from "@/lib/canvas/links";
import { getTimetableFeedUrl } from "@/lib/env.server";
import { PATHWAY_COURSE_COLUMNS, summarizeTerms } from "@/lib/pathway/summarize";
import { createClient } from "@/lib/supabase/server";

// The "Sync now" server action runs under this page's limit, so give a sync room to finish.
export const maxDuration = 60;

const HISTORY_LIMIT = 20;
const RUN_COLUMNS = "id, source, status, started_at, finished_at, inserted, updated, unchanged, error_message";

export default function SettingsPage() {
  return (
    <main className={PAGE_CLASS}>
      <PageHeader title="Settings" />
      <Suspense fallback={<SettingsSkeleton />}>
        <SyncSections />
      </Suspense>
      <Section id="appearance" title="Appearance" footer="Saved on this device. System follows your device’s light or dark setting.">
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-medium">Theme</span>
            <ThemeToggle />
          </CardContent>
        </Card>
      </Section>
      <Suspense fallback={null}>
        <Account />
      </Suspense>
    </main>
  );
}

// The iOS Settings pattern: a small heading, a card of rows, and an optional note under it.
function Section({ id, title, action, footer, children }: { id: string; title: string; action?: ReactNode; footer?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end justify-between gap-2 px-1">
        <h2 id={id} className="text-headline">
          {title}
        </h2>
        {action}
      </div>
      {children}
      {footer && <p className="px-1 text-sm text-muted-foreground">{footer}</p>}
    </section>
  );
}

// Last, since it's the least used: who's signed in, and the way out.
async function Account() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = typeof data?.claims.email === "string" ? data.claims.email : null;
  return (
    <Section id="account" title="Account">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <span className="min-w-0 text-sm">
            <span className="block font-medium">Signed in</span>
            {email && <span className="block truncate text-muted-foreground">{email}</span>}
          </span>
          <form action={signOut}>
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </CardContent>
      </Card>
    </Section>
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
      .select(`id, name, kind, time_zone, courses(${PATHWAY_COURSE_COLUMNS})`)
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

      <Section id="sync-heading" title="Sync" action={<SyncNowForm />}>
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
      </Section>

      <Section id="links-heading" title={`Course links${currentTerm ? ` · ${currentTerm.name}` : ""}`} footer="Only linked courses sync from Canvas.">
        {/* Its own boundary: this one calls Canvas, so a slow answer must not hold up the rest. */}
        <Suspense fallback={<CourseLinksSkeleton />}>
          <CourseLinks term={currentTerm ? { id: currentTerm.id, name: currentTerm.name } : null} />
        </Suspense>
      </Section>

      <Section id="feed-heading" title="Calendar feed">
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
      </Section>

      <Section id="history-heading" title="Sync history">
        <SyncHistory runs={runs} timeZone={timeZone} />
      </Section>
    </>
  );
}
