import { monthGrid } from "@/lib/dashboard/agenda";
import { TODAY_MARKER_CLASS } from "@/components/today-marker";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * A compact month: today is filled, days with deadlines get a dot and exam days a bar (neutral
 * marks told apart by shape: these are kinds of event, not statuses). Classes are
 * not marked; they fall on nearly every weekday, so a mark would say nothing.
 */
export function MonthCalendar({
  today,
  deadlines,
  exams,
}: {
  today: string;
  /** Count of deadlines per "YYYY-MM-DD". */
  deadlines: ReadonlyMap<string, number>;
  exams: ReadonlySet<string>;
}) {
  const [year, month] = today.split("-").map(Number) as [number, number];
  const weeks = monthGrid(year, month);
  const title = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );

  return (
    <table className="w-full table-fixed text-center text-xs">
      <caption className="mb-2 text-left text-headline">{title}</caption>
      <thead>
        <tr className="text-tertiary-foreground">
          {WEEKDAYS.map((day) => (
            <th key={day} scope="col" className="pb-1 font-medium">
              <abbr title={day} className="no-underline">
                {day[0]}
              </abbr>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {weeks.map((week) => (
          <tr key={week.find(Boolean) ?? "pad"}>
            {week.map((day, index) => {
              if (!day) return <td key={`pad-${index}`} />;
              const due = deadlines.get(day) ?? 0;
              const exam = exams.has(day);
              const label = [
                due > 0 && `${due} deadline${due > 1 ? "s" : ""}`,
                exam && "exam",
              ].filter(Boolean).join(", ");
              return (
                <td key={day} className="py-0.5">
                  <span
                    className={cn(
                      "relative mx-auto flex size-7 flex-col items-center justify-center rounded-full tabular-nums",
                      day === today && TODAY_MARKER_CLASS,
                      day < today && "text-tertiary-foreground",
                    )}
                    aria-current={day === today ? "date" : undefined}
                  >
                    {Number(day.slice(8))}
                    {label && <span className="sr-only">, {label}</span>}
                    <span aria-hidden className="absolute bottom-0.5 flex gap-0.5">
                      {due > 0 && <span className={cn("size-1 rounded-full", day === today ? "bg-background" : "bg-muted-foreground")} />}
                      {exam && <span className={cn("h-1 w-2 rounded-full", day === today ? "bg-background" : "bg-foreground")} />}
                    </span>
                  </span>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
