"use client";

import { useOptimistic, useTransition } from "react";
import { setFocus } from "@/app/(app)/pathway/actions";
import type { FocusInfo } from "@/lib/setup/setup";
import { cn } from "@/lib/utils";

// A switch between the plan's directions. It flips at once and the page catches up when the
// cookie is saved; a group of pressed buttons, so screen readers hear which one is on.
export function FocusToggle({ focuses, focus }: { focuses: FocusInfo[]; focus: string }) {
  const [shown, show] = useOptimistic(focus);
  const [, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2.5">
      <span id="focus-label" className="text-sm text-muted-foreground">
        Rank for
      </span>
      <div role="group" aria-labelledby="focus-label" className="flex w-max gap-0.5 rounded-full bg-fill-secondary p-1">
        {focuses.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={shown === option.id}
            onClick={() =>
              startTransition(async () => {
                show(option.id);
                await setFocus(option.id);
              })
            }
            className={cn(
              "press rounded-full px-3 py-1 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring",
              shown === option.id ? "bg-card text-foreground shadow-card" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.name}
          </button>
        ))}
      </div>
    </div>
  );
}
