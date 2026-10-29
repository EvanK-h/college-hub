import { AnnouncementItem } from "@/components/courses/announcement-item";
import { CourseCode } from "@/components/courses/course-code";
import { OpenAnnouncementFromHash } from "@/components/courses/open-announcement";
import { htmlToText } from "@/lib/announcements/text";
import { formatDay } from "@/lib/timetable/format";

export type CourseAnnouncement = {
  id: string;
  title: string;
  message: string | null;
  author: string | null;
  posted_at: string | null;
  html_url: string;
  read: boolean;
  important: boolean;
  /** Set in the inbox, where announcements from every course are mixed. */
  course?: { code: string } | null;
};

// Each announcement opens with a native <details>, so it works with the keyboard. Opening one
// marks it read (AnnouncementItem). In the inbox each carries its course code.
export function AnnouncementList({
  announcements,
  timeZone,
  empty = "No announcements in the last 60 days.",
}: {
  announcements: CourseAnnouncement[];
  timeZone: string;
  empty?: string;
}) {
  if (announcements.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }

  return (
    <>
      <OpenAnnouncementFromHash />
      <ul className="flex flex-col divide-y divide-separator rounded-2xl bg-card shadow-card">
        {announcements.map((announcement) => (
          <li key={announcement.id} id={`announcement-${announcement.id}`} className="scroll-mt-20 px-5 py-3.5">
            <AnnouncementItem
              id={announcement.id}
              title={announcement.title}
              meta={[announcement.author, announcement.posted_at && formatDay(new Date(announcement.posted_at), timeZone)].filter(Boolean).join(" · ")}
              body={htmlToText(announcement.message)}
              url={announcement.html_url}
              read={announcement.read}
              important={announcement.important}
              badge={announcement.course ? <CourseCode code={announcement.course.code} /> : undefined}
            />
          </li>
        ))}
      </ul>
    </>
  );
}
