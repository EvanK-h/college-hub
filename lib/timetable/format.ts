// Session times are stored in UTC and shown in the term's time zone, formatted at display time.

function parts(date: Date, timeZone: string, options: Intl.DateTimeFormatOptions) {
  const values = new Map(new Intl.DateTimeFormat("en-GB", { ...options, timeZone }).formatToParts(date).map((p) => [p.type, p.value]));
  return (type: Intl.DateTimeFormatPartTypes) => values.get(type) ?? "";
}

/** "Tue 3 Nov". */
export function formatDay(date: Date, timeZone: string): string {
  const get = parts(date, timeZone, { weekday: "short", day: "numeric", month: "short" });
  return `${get("weekday")} ${get("day")} ${get("month")}`;
}

/** "10:00". */
export function formatTime(date: Date, timeZone: string): string {
  const get = parts(date, timeZone, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return `${get("hour")}:${get("minute")}`;
}

/** Minutes since midnight in the zone, for placing a session on a time grid. */
export function minutesOfDay(date: Date, timeZone: string): number {
  const get = parts(date, timeZone, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return Number(get("hour")) * 60 + Number(get("minute"));
}

/** "10:00 – 11:40". */
export function formatTimeRange(start: Date, end: Date, timeZone: string): string {
  return `${formatTime(start, timeZone)} – ${formatTime(end, timeZone)}`;
}

/** The calendar day ("2026-11-03") a moment falls on in the zone, for grouping by day. */
export function dayKey(date: Date, timeZone: string): string {
  const get = parts(date, timeZone, { year: "numeric", month: "2-digit", day: "2-digit" });
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/**
 * A room as it fits in a narrow column: "Portsoken COMBINED 528 & 532 [94 cap]" becomes
 * "Portsoken COMBINED 528 & 532". The room's capacity is noise when you're finding the room.
 * Capitals are left alone, since building acronyms (ISEC) would be mangled. The full string goes
 * in a `title`.
 */
export function shortLocation(location: string): string {
  return location.replace(/\s*\[\s*\d+\s*cap\s*\]/gi, "").trim();
}
