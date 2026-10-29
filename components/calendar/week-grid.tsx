import Link from "next/link";
import { StatusPill } from "@/components/assignments/status-pill";
import { TODAY_MARKER_CLASS } from "@/components/today-marker";
import { assignmentStatus, type StatusInput } from "@/lib/assignments/status";
import { hourRange, layoutDay } from "@/lib/calendar/grid";
import { coursePath } from "@/lib/courses/slug";
import { categoryClass } from "@/lib/setup/setup";
import { dayKey, formatTime, minutesOfDay, shortLocation } from "@/lib/timetable/format";
import { SESSION_TYPE_LABELS, type SessionType } from "@/lib/timetable/kind";
import { cn } from "@/lib/utils";

const HOUR_PX = 48;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export type GridSession = {
  id: string;
  kind: SessionType;
  title: string;
  starts_at: string;
  ends_at: string;
  location: string | null;
  cancelled: boolean;
  courses: { code: string; type: { color: number } | null } | null;
};
export type GridAssignment = StatusInput & { id: string; title: string; html_url: string; courses: { code: string } | null };

/**
 * A week as a time grid: one column per day, classes as blocks sized by their length, so free
 * time and clashes are visible at a glance. Deadlines are moments, not spans, so they sit in a
 * strip above the hours. Each block carries its course type's bar, as on the pathway; the course
 * code tells this term's courses apart. A line marks the time now in today's column.
 */
export function WeekGrid({
  days,
  today,
  timeZone,
  now,
}: {
  days: { day: string; sessions: GridSession[]; due: GridAssignment[] }[];
  today: string;
  timeZone: string;
  now: Date;
}) {
  const timed = days.map((day) =>
    layoutDay(
      day.sessions.map((session) => ({
        item: session,
        start: minutesOfDay(new Date(session.starts_at), timeZone),
        // A session past midnight is drawn to the end of its first day.
        end: dayKey(new Date(session.ends_at), timeZone) === day.day ? minutesOfDay(new Date(session.ends_at), timeZone) : 24 * 60,
      })),
    ),
  );
  const [firstHour, lastHour] = hourRange(timed.flat());
  const hours = Array.from({ length: lastHour - firstHour }, (_, index) => firstHour + index);
  const top = (minutes: number) => ((minutes - firstHour * 60) / 60) * HOUR_PX;
  const hasDeadlines = days.some((day) => day.due.length > 0);
  const nowMinutes = minutesOfDay(now, timeZone);
  const columns = "grid grid-cols-[3.25rem_repeat(7,minmax(0,1fr))]";

  return (
    <div className="overflow-x-auto rounded-2xl bg-card shadow-card">
      <div className="min-w-3xl">
        <div className={cn(columns, "border-b border-separator")}>
          <span />
          {days.map((day, index) => (
            <h2 key={day.day} aria-current={day.day === today ? "date" : undefined} className="flex items-center gap-1 px-2 py-2.5 text-sm font-semibold">
              <span className={cn(day.day < today && "text-muted-foreground")}>{WEEKDAYS[index]}</span>
              <span
                className={cn(
                  "inline-flex size-6 items-center justify-center rounded-full tabular-nums",
                  day.day === today ? TODAY_MARKER_CLASS : day.day < today && "text-muted-foreground",
                )}
              >
                {Number(day.day.slice(8))}
              </span>
            </h2>
          ))}
        </div>

        {hasDeadlines && (
          <div className={cn(columns, "border-b border-separator")}>
            <span className="px-2 py-2 text-right text-xs text-tertiary-foreground">Due</span>
            {days.map((day) => (
              <ul key={day.day} className="flex min-w-0 flex-col gap-1 border-l border-separator p-1.5">
                {day.due.map((assignment) => (
                  <li key={assignment.id} className="flex min-w-0 flex-col gap-1 rounded-lg bg-fill-tertiary p-1.5 text-xs">
                    <a
                      href={assignment.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={assignment.title}
                      className="truncate font-medium underline-offset-4 hover:underline"
                    >
                      {assignment.title}
                    </a>
                    <span className="truncate text-muted-foreground tabular-nums">
                      {[assignment.due_at && formatTime(new Date(assignment.due_at), timeZone), assignment.courses?.code].filter(Boolean).join(" · ")}
                    </span>
                    <StatusPill status={assignmentStatus(assignment, now)} className="self-start" />
                  </li>
                ))}
              </ul>
            ))}
          </div>
        )}

        <div className={columns}>
          {/* Hour labels sit on the lines they name. */}
          <div className="relative" style={{ height: hours.length * HOUR_PX }}>
            {hours.slice(1).map((hour) => (
              <span
                key={hour}
                className="absolute right-2 -translate-y-1/2 text-xs text-tertiary-foreground tabular-nums"
                style={{ top: (hour - firstHour) * HOUR_PX }}
              >
                {String(hour).padStart(2, "0")}:00
              </span>
            ))}
          </div>
          {days.map((day, index) => (
            <div
              key={day.day}
              className="relative border-l border-separator bg-[linear-gradient(to_bottom,var(--separator)_1px,transparent_1px)]"
              style={{ height: hours.length * HOUR_PX, backgroundSize: `100% ${HOUR_PX}px` }}
            >
              {timed[index]?.map(({ item: session, start, end, lane, lanes }) => (
                <SessionBlock
                  key={session.id}
                  session={session}
                  timeZone={timeZone}
                  past={new Date(session.ends_at) < now}
                  style={{
                    top: top(start) + 1,
                    height: Math.max(top(end) - top(start) - 2, 20),
                    left: `calc(${(lane / lanes) * 100}% + 2px)`,
                    width: `calc(${100 / lanes}% - 4px)`,
                  }}
                />
              ))}
              {day.day === today && nowMinutes >= firstHour * 60 && nowMinutes <= lastHour * 60 && (
                <div aria-hidden className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: top(nowMinutes) - 1 }}>
                  <span className="-ml-1 size-2 rounded-full bg-foreground" />
                  <span className="h-0.5 flex-1 bg-foreground" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SessionBlock({ session, timeZone, past, style }: { session: GridSession; timeZone: string; past: boolean; style: React.CSSProperties }) {
  const time = `${formatTime(new Date(session.starts_at), timeZone)}–${formatTime(new Date(session.ends_at), timeZone)}`;
  const name = session.courses ? `${session.courses.code} ${SESSION_TYPE_LABELS[session.kind].toLowerCase()}` : session.title;
  const label = [name, time, session.location, session.cancelled && "cancelled"].filter(Boolean).join(", ");
  const className = cn(
    "absolute flex gap-1.5 overflow-hidden rounded-lg bg-fill-secondary p-1.5 text-xs leading-tight",
    // Cancelled sessions keep their place but are struck through on a hatched fill.
    session.cancelled && "bg-[repeating-linear-gradient(135deg,var(--fill-tertiary)_0_6px,transparent_6px_12px)] text-muted-foreground line-through",
    past && !session.cancelled && "opacity-60",
    session.kind === "exam" && "ring-2 ring-foreground ring-inset",
    categoryClass(session.courses?.type?.color ?? 5),
  );
  const content = (
    <>
      <span aria-hidden className="w-1 shrink-0 rounded-full bg-(--course) contrast-more:w-1.5" />
      <span className="flex min-w-0 flex-col">
        <span className={cn("truncate", session.kind === "exam" ? "font-bold" : "font-semibold")}>
          {session.courses ? (
            <>
              {session.courses.code} <span className="font-normal">{SESSION_TYPE_LABELS[session.kind]}</span>
            </>
          ) : (
            session.title
          )}
        </span>
        <span className="truncate text-muted-foreground tabular-nums">{time}</span>
        {session.location && <span className="truncate text-muted-foreground">{shortLocation(session.location)}</span>}
      </span>
    </>
  );

  return session.courses ? (
    <Link href={coursePath(session.courses.code)} aria-label={label} title={label} style={style} className={cn(className, "hover:bg-fill focus-visible:outline-2 focus-visible:outline-ring")}>
      {content}
    </Link>
  ) : (
    <div title={label} style={style} className={className}>
      {content}
    </div>
  );
}
