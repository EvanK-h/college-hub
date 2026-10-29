import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AnnouncementList } from "@/components/courses/announcement-list";
import { PAGE_CLASS, PageHeader } from "@/components/page-header";
import { CardListSkeleton } from "@/components/skeletons";
import { PATHWAY_COURSE_COLUMNS, summarizeTerms } from "@/lib/pathway/summarize";
import { createClient } from "@/lib/supabase/server";

const LIMIT = 100;

// Every course's announcements in one list, newest first: the "See all" behind Today's
// announcements card. Opening one marks it read, as on a course page.
export default function AnnouncementsPage() {
  return (
    <main className={PAGE_CLASS}>
      <PageHeader back={{ href: "/", label: "Today" }} title="Announcements" />
      <Suspense fallback={<CardListSkeleton count={4} lines={1} />}>
        <Inbox />
      </Suspense>
    </main>
  );
}

async function Inbox() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  // The proxy already redirects signed-out visitors; this is a second check in case it is ever bypassed.
  if (!claims?.claims) redirect("/login");

  const [announcementsResult, termsResult] = await Promise.all([
    supabase
      .from("announcements")
      .select("id, title, message, author, posted_at, html_url, read, important, course:courses(code)")
      .eq("deleted_in_canvas", false)
      .order("posted_at", { ascending: false })
      .limit(LIMIT),
    supabase.from("terms").select(`id, name, kind, time_zone, courses(${PATHWAY_COURSE_COLUMNS})`).order("id"),
  ]);
  if (announcementsResult.error) throw new Error(`Loading announcements failed: ${announcementsResult.error.message}`);
  if (termsResult.error) throw new Error(`Loading terms failed: ${termsResult.error.message}`);

  // Dates in the current term's time zone, as everywhere else.
  const current = summarizeTerms(termsResult.data).find((term) => term.phase === "current");
  const timeZone = termsResult.data.find((term) => term.id === current?.id)?.time_zone ?? "UTC";
  const unread = announcementsResult.data.filter((announcement) => !announcement.read).length;

  return (
    <section aria-label="All announcements" className="flex flex-col gap-3">
      <p className="px-1 text-sm text-muted-foreground tabular-nums">{unread === 0 ? "All read." : `${unread} unread`}</p>
      <AnnouncementList announcements={announcementsResult.data} timeZone={timeZone} empty="No announcements yet." />
    </section>
  );
}
