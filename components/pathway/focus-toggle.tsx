"use client";

import { useOptimistic, useTransition } from "react";
import { setFocus } from "@/app/(app)/pathway/actions";
import { FOCUSES, FOCUS_LABELS, type Focus } from "@/lib/pathway/focus";
import { cn } from "@/lib/utils";

// A two-way switch for the plan's direction. It flips at once and the page catches up when the
// cookie is saved; a group of pressed buttons, so screen readers hear which one is on.
export function FocusToggle({ focus }: { focus: Focus }) {
  const [shown, show] = useOptimistic(focus);
  const [, startTransition] = useTransition();

  return (
    <div role="group" aria-label="Focus" className="flex w-max gap-0.5 rounded-full bg-fill-secondary p-1">
      {FOCUSES.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={shown === option}
          onClick={() =>
            startTransition(async () => {
              show(option);
              await setFocus(option);
            })
          }
          className={cn(
            "press rounded-full px-3 py-1 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring",
            shown === option ? "bg-card text-foreground shadow-card" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {FOCUS_LABELS[option]}
        </button>
      ))}
    </div>
  );
}
