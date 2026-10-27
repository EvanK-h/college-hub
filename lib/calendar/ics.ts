import { z } from "zod";

// The JSON calendar_feed() returns. It comes from our own database, but it arrives as untyped
// JSON, so it is checked like any other payload before it is turned into a calendar.
export const feedSchema = z.object({
  sessions: z.array(
    z.object({
      id: z.uuid(),
      kind: z.string(),
      starts_at: z.string(),
      ends_at: z.string(),
      location: z.string().nullable(),
      cancelled: z.boolean(),
      course_code: z.string(),
      course_title: z.string(),
    }),
  ),
  assignments: z.array(
    z.object({
      id: z.uuid(),
      title: z.string(),
      due_at: z.string().nullable(),
      html_url: z.string(),
      course_code: z.string(),
    }),
  ),
});

export type Feed = z.infer<typeof feedSchema>;

const SESSION_NAMES: Record<string, string> = {
  lecture: "Lecture",
  lab: "Lab",
  seminar: "Seminar",
  tutorial: "Tutorial",
  workshop: "Workshop",
  exam: "Exam",
};

/** RFC 5545 text: backslash, semicolon, comma and newlines are escaped. */
export function escapeText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** "2026-10-27T12:00:00Z" → "20261027T120000Z". */
export function formatUtc(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Folds a content line at 75 bytes (RFC 5545 §3.1) without splitting a UTF-8 character. */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    // Continuation lines start with a space, which counts towards their 75.
    const limit = parts.length === 0 ? 75 : 74;
    if (bytes + size > limit) {
      parts.push(current);
      current = "";
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

/** The whole feed as an iCalendar file: classes and exams as timed events, deadlines as instants. */
export function buildCalendar(feed: Feed, now: Date): string {
  const stamp = formatUtc(now.toISOString());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//College Hub//Calendar feed//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:College Hub",
    // Ask subscribers to refresh hourly; most phone apps poll on their own schedule anyway.
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];

  for (const session of feed.sessions) {
    const name = SESSION_NAMES[session.kind] ?? "Class";
    lines.push(
      "BEGIN:VEVENT",
      `UID:session-${session.id}@college-hub`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${formatUtc(session.starts_at)}`,
      `DTEND:${formatUtc(session.ends_at)}`,
      `SUMMARY:${escapeText(`${session.course_code} ${name}`)}`,
      `DESCRIPTION:${escapeText(session.course_title)}`,
      ...(session.location ? [`LOCATION:${escapeText(session.location)}`] : []),
      `STATUS:${session.cancelled ? "CANCELLED" : "CONFIRMED"}`,
      "END:VEVENT",
    );
  }

  for (const assignment of feed.assignments) {
    if (!assignment.due_at) continue;
    const due = formatUtc(assignment.due_at);
    lines.push(
      "BEGIN:VEVENT",
      `UID:assignment-${assignment.id}@college-hub`,
      `DTSTAMP:${stamp}`,
      // A deadline is a moment, not a span, as Canvas's own feed shows it.
      `DTSTART:${due}`,
      `DTEND:${due}`,
      `SUMMARY:${escapeText(`Due: ${assignment.title} (${assignment.course_code})`)}`,
      `URL:${assignment.html_url}`,
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}
