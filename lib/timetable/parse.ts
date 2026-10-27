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

// "CS 2100 …" or "PHYS1151 …" at the start of the title.
const COURSE_CODE = /^([A-Z]{2,4}) ?(\d{4})\b/;
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
 * Parses an ICS feed into class sessions starting within [from, to]. Repeating events are expanded
 * into their occurrences (skipping EXDATEs, applying moved instances). All-day events and events
 * whose title does not start with a course code are left out. Throws if the text is not a calendar
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
      const code = COURSE_CODE.exec(title);
      if (!code) continue;

      sessions.push({
        icsUid: occurrence.uid,
        recurrenceId: occurrence.recurrenceId,
        courseCode: `${code[1]} ${code[2]}`,
        // Guessed from the words after the code, so a subject code can't read as a type.
        kind: guessSessionType(title.slice(code[0].length), occurrence.description),
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
