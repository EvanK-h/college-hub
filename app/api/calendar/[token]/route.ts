import { buildCalendar, feedSchema } from "@/lib/calendar/ics";
import { createAnonClient } from "@/lib/supabase/anon";

// The personal calendar feed a phone subscribes to. The token in the URL is the only credential:
// the proxy lets /api/calendar/* through without a session, and calendar_feed() returns data only
// for the owner whose token hash matches. Unknown tokens get a bare 404 that says nothing more.
export async function GET(_request: Request, { params }: RouteContext<"/api/calendar/[token]">) {
  const { token: raw } = await params;
  // Some calendar apps want a file extension, so /api/calendar/<token>.ics works too.
  const token = raw.replace(/\.ics$/, "");

  const { data, error } = await createAnonClient().rpc("calendar_feed", { p_token: token });
  if (error) {
    console.error("Calendar feed failed:", error.message);
    return new Response("Calendar unavailable", { status: 500 });
  }
  if (data === null) return new Response("Not found", { status: 404 });

  const feed = feedSchema.safeParse(data);
  if (!feed.success) {
    console.error("Calendar feed returned an unexpected shape");
    return new Response("Calendar unavailable", { status: 500 });
  }

  return new Response(buildCalendar(feed.data, new Date()), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="college-hub.ics"',
      // Personal data: never stored by shared caches, and never indexed.
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
