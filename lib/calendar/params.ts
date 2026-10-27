import { z } from "zod";
import { addDays } from "@/lib/dashboard/agenda";

export type CalendarView = "month" | "week";

// The URL is untrusted input, so anything unexpected falls back to this month instead of erroring.
const paramsSchema = z.object({
  view: z.enum(["month", "week"]).catch("month"),
  date: z.iso.date().optional().catch(undefined),
});

/** Reads `?view=` and `?date=` (first value only), defaulting to the month containing `today`. */
export function parseCalendarParams(
  searchParams: Record<string, string | string[] | undefined>,
  today: string,
): { view: CalendarView; date: string } {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const parsed = paramsSchema.parse({ view: first(searchParams.view), date: first(searchParams.date) });
  return { view: parsed.view, date: parsed.date ?? today };
}

/** The Monday on or before `day`. */
export function startOfWeek(day: string): string {
  const weekday = (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
  return addDays(day, -weekday);
}

/** The first of `day`'s month, moved by `months`. */
export function shiftMonth(day: string, months: number): string {
  const date = new Date(`${day.slice(0, 7)}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

/** The first and last day shown by a view, inclusive. Week: Monday to Sunday. Month: the 1st to the last day. */
export function viewRange(view: CalendarView, date: string): { first: string; last: string } {
  if (view === "week") {
    const first = startOfWeek(date);
    return { first, last: addDays(first, 6) };
  }
  const first = shiftMonth(date, 0);
  return { first, last: addDays(shiftMonth(date, 1), -1) };
}

/** The dates the previous and next links point at. */
export function neighbours(view: CalendarView, date: string): { previous: string; next: string } {
  if (view === "week") {
    const monday = startOfWeek(date);
    return { previous: addDays(monday, -7), next: addDays(monday, 7) };
  }
  return { previous: shiftMonth(date, -1), next: shiftMonth(date, 1) };
}
