import { Star } from "lucide-react";
import { setAnnouncementFlag } from "@/app/(app)/courses/[code]/actions";
import { Button } from "@/components/ui/button";
import { htmlToText } from "@/lib/announcements/text";
import { formatDay } from "@/lib/timetable/format";
import { cn } from "@/lib/utils";

export type CourseAnnouncement = {
  id: string;
  title: string;
  message: string | null;
  author: string | null;
  posted_at: string | null;
  html_url: string;
  read: boolean;
  important: boolean;
};

// Each announcement opens with a native <details>, so it works with the keyboard and without JavaScript.
// The read and important toggles are small forms posting to Server Actions.
export function AnnouncementList({ announcements, timeZone }: { announcements: CourseAnnouncement[]; timeZone: string }) {
  if (announcements.length === 0) {
    return <p className="text-sm text-muted-foreground">No announcements in the last 60 days.</p>;
  }

  return (
    <ul className="flex flex-col divide-y divide-separator rounded-2xl bg-card shadow-card">
      {announcements.map((announcement) => (
        <li key={announcement.id} className="px-5 py-3.5">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-start gap-3 rounded-lg [&::-webkit-details-marker]:hidden">
              <span
                aria-hidden
                className={cn("mt-1.5 size-2 shrink-0 rounded-full", announcement.read ? "bg-transparent" : "bg-muted-foreground")}
              />
              <span className="min-w-0 flex-1">
                <span className={cn("block", announcement.read ? "font-normal" : "font-semibold")}>
                  {announcement.title}
                  {!announcement.read && <span className="sr-only"> (unread)</span>}
                </span>
                <span className="mt-0.5 block text-xs text-tertiary-foreground">
                  {[announcement.author, announcement.posted_at && formatDay(new Date(announcement.posted_at), timeZone)]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
              {announcement.important && <Star aria-label="Important" className="mt-0.5 size-4 fill-current text-muted-foreground" />}
            </summary>
            <div className="mt-3 flex flex-col gap-3 pl-5">
              <p className="text-sm leading-relaxed whitespace-pre-line">{htmlToText(announcement.message) || "No text."}</p>
              <div className="flex flex-wrap items-center gap-2">
                <FlagButton id={announcement.id} flag="read" value={!announcement.read}>
                  {announcement.read ? "Mark unread" : "Mark read"}
                </FlagButton>
                <FlagButton id={announcement.id} flag="important" value={!announcement.important}>
                  {announcement.important ? "Not important" : "Mark important"}
                </FlagButton>
                <a
                  href={announcement.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary underline-offset-4 hover:underline"
                >
                  Open in Canvas
                </a>
              </div>
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}

function FlagButton({ id, flag, value, children }: { id: string; flag: "read" | "important"; value: boolean; children: string }) {
  return (
    <form action={setAnnouncementFlag}>
      <input type="hidden" name="announcementId" value={id} />
      <input type="hidden" name="flag" value={flag} />
      <input type="hidden" name="value" value={String(value)} />
      <Button type="submit" size="sm" variant="secondary">
        {children}
      </Button>
    </form>
  );
}
