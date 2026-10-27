"use client";

import { useId, useState } from "react";
import { Label } from "@/components/ui/label";
import { LETTER_TARGETS, neededForTarget, type GradeGroup, type GradeItem } from "@/lib/grades/calculator";

const SELECT_CLASS =
  "h-10 w-full rounded-xl border border-input bg-card px-3 text-sm focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/25 focus-visible:outline-none dark:bg-muted";

const percent = (value: number) => `${value.toFixed(1)}%`;

// Client component only for the target picker; the maths is the pure, tested calculator.
export function GradeCalculator({ groups, items }: { groups: GradeGroup[]; items: GradeItem[] }) {
  const id = useId();
  const [target, setTarget] = useState(90);
  const outcome = neededForTarget(groups, items, target);

  let message: string;
  switch (outcome.kind) {
    case "secured":
      message = "Already secured, whatever happens on the work left.";
      break;
    case "needed":
      message = `Average ${percent(outcome.percent)} on the work still to be graded.`;
      break;
    case "out_of_reach":
      message = `Out of reach: full marks on everything left ends at ${percent(outcome.bestPercent)}.`;
      break;
    case "no_remaining_work":
      message = "Nothing is left to grade in Canvas yet.";
      break;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-1.5">
        <Label htmlFor={id}>Target grade</Label>
        <select id={id} value={target} onChange={(event) => setTarget(Number(event.target.value))} className={SELECT_CLASS}>
          {LETTER_TARGETS.map(({ letter, minimum }) => (
            <option key={letter} value={minimum}>
              {letter} ({minimum}%)
            </option>
          ))}
        </select>
      </div>
      {/* Announced when the target changes. */}
      <p role="status" className="text-sm">
        {message}
      </p>
      <p className="text-xs text-tertiary-foreground">
        Counts only assignments already posted in Canvas. Drop rules and excused work are not included.
      </p>
    </div>
  );
}
