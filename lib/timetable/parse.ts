import ical, { type EventInstance, type ParameterValue } from "node-ical";
import { z } from "zod";
import { guessSessionType, type SessionType } from "./kind";

/** One dated occurrence of a class, ready to be matched to a course and written. */
export type ParsedSession = {
  icsUid: string;
  /**
   * With the UID, the session's identity: null for a one-off event, otherwise the occurrence's
   * original start (its RECURRENCE-ID), which stays the same when the occurrence is moved.
   */
  recurrenceId: Date | null;
  /** Normalised to the pathway's form, e.g. "CS 2100". */
  courseCode: string;
  kind: SessionType;
  title: string;
  startsAt: Date;
  endsAt: Date;
  location: string | null;
  cancelled: boolean;
};

// "CS 2100" or "CS2100". Celcat titles read "Discrete Structures CS1800; Lecture": the code ends
// the part before the semicolon and the session type follows it.
const COURSE_CODE = /\b([A-Z]{2,4}) ?(\d{4})\b/g;
// Outlook keeps a cancelled meeting in the feed and prefixes its title.
const CANCELLED_PREFIX = /^cancell?ed\s*:\s*/i;

// node-ical's output is typed but not checked, so every occurrence passes through this before use.
const occurrenceSchema = z
  .object({
    uid: z.string().min(1),
    recurrenceId: z.date().nullable(),
    summary: z.string().trim().min(1),
    description: z.string(),
    location: z.string().trim().nullable(),
    start: z.date(),
    end: z.date(),
    status: z.enum(["TENTATIVE", "CONFIRMED", "CANCELLED"]).optional(),
  })
  .refine((occurrence) => occurrence.end >= occurrence.start, { message: "event ends before it starts" });

/** A property's text, whether node-ical gave it as a string or as `{ val, params }`. */
function text(value: ParameterValue | undefined): string | undefined {
  if (value === undefined) return undefined;
  return typeof value === "string" ? value : value.val;
}

/** null for a one-off event; otherwise the occurrence's original start, even if it was moved. */
function recurrenceIdOf(instance: EventInstance): Date | null {
  if (instance.isOverride) return instance.event.recurrenceid ?? instance.start;
  return instance.isRecurring ? instance.start : null;
}

/**
 * Finds the course code in a title: the last code before the first semicolon, so a code inside the
 * course's name can't win. `rest` is the text after it, which names the session type.
 */
export function findCourseCode(title: string): { code: string; rest: string } | null {
  const head = title.split(";")[0] ?? "";
  const match = [...head.matchAll(COURSE_CODE)].at(-1);
  if (!match) return null;
  return { code: `${match[1]} ${match[2]}`, rest: title.slice(match.index + match[0].length) };
}

/**
 * Parses an ICS feed into class sessions starting within [from, to]. Repeating events are expanded
 * into their occurrences (skipping EXDATEs, applying moved instances). All-day events and events
 * without a course code in their title are left out. Throws if the text is not a calendar
 * or an event is malformed, so a broken feed never reaches the database.
 */
export function parseTimetable(ics: string, { from, to }: { from: Date; to: Date }): ParsedSession[] {
  if (!/^\s*BEGIN:VCALENDAR/.test(ics)) throw new Error("the feed is not an ICS calendar");

  const sessions: ParsedSession[] = [];
  for (const component of Object.values(ical.sync.parseICS(ics))) {
    if (component?.type !== "VEVENT") continue;

    for (const instance of ical.expandRecurringEvent(component, { from, to })) {
      if (instance.isFullDay) continue;
      const { event } = instance;

      const occurrence = occurrenceSchema.parse({
        uid: event.uid,
        recurrenceId: recurrenceIdOf(instance),
        summary: text(instance.summary),
        description: text(event.description) ?? "",
        location: text(event.location) || null,
        start: instance.start,
        end: instance.end,
        status: event.status,
      });

      const title = occurrence.summary.replace(CANCELLED_PREFIX, "");
      const found = findCourseCode(title);
      if (!found) continue;

      sessions.push({
        icsUid: occurrence.uid,
        recurrenceId: occurrence.recurrenceId,
        courseCode: found.code,
        // Guessed from the words after the code, so a subject code or course name can't read as a type.
        kind: guessSessionType(found.rest, occurrence.description),
        title,
        startsAt: occurrence.start,
        endsAt: occurrence.end,
        location: occurrence.location,
        cancelled: occurrence.status === "CANCELLED" || title !== occurrence.summary,
      });
    }
  }

  return sessions.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}
