"use client";

import { useId, useState } from "react";
import { letterTargets, neededForTarget, type GradeGroup, type GradeItem } from "@/lib/grades/calculator";
import type { GradeScale } from "@/lib/setup/setup";
import { cn } from "@/lib/utils";

const percent = (value: number) => `${value.toFixed(1)}%`;

// Client component only for the target picker; the maths is the pure, tested calculator.
// The letters come from the profile's grade scale; it starts on 90% when the scale has it (an A−
// on the common scale), otherwise on the best letter. The letters are radios drawn as chips, so the
// target is one tap and the arrow keys move between them.
export function GradeCalculator({ groups, items, scale }: { groups: GradeGroup[]; items: GradeItem[]; scale: GradeScale }) {
  const id = useId();
  const targets = letterTargets(scale);
  const [target, setTarget] = useState(() => targets.find(({ minimum }) => minimum === 90)?.minimum ?? targets[0]?.minimum ?? 90);
  const outcome = neededForTarget(groups, items, target);

  let message: string;
  switch (outcome.kind) {
    case "secured":
      message = "Already secured, whatever happens on the work left.";
      break;
    case "needed":
      message = `For ${targets.find(({ minimum }) => minimum === target)?.letter ?? "it"} (${target}%), average ${percent(outcome.percent)} on the work still to be graded.`;
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
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">Target grade</legend>
        <div className="flex flex-wrap gap-1.5">
          {targets.map(({ letter, minimum }) => (
            <label
              key={letter}
              title={`${minimum}% or more`}
              className="flex h-8 min-w-10 cursor-pointer items-center justify-center rounded-full bg-fill-tertiary px-2.5 text-sm font-medium text-muted-foreground tabular-nums hover:bg-fill-secondary hover:text-foreground has-checked:bg-foreground has-checked:text-background has-focus-visible:outline-2 has-focus-visible:outline-ring"
            >
              <input
                type="radio"
                name={id}
                value={minimum}
                checked={target === minimum}
                onChange={() => setTarget(minimum)}
                className="sr-only"
              />
              {letter}
            </label>
          ))}
        </div>
      </fieldset>
      {/* Announced when the target changes. */}
      <p role="status" className={cn("text-sm", outcome.kind === "out_of_reach" && "font-medium text-destructive")}>
        {message}
      </p>
      <p className="text-xs text-tertiary-foreground">
        Counts only assignments already posted in Canvas. Drop rules and excused work are not included.
      </p>
    </div>
  );
}
