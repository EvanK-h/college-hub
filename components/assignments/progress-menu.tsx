"use client";

import { useOptimistic, useTransition } from "react";
import { Menu } from "@base-ui/react/menu";
import { Check, ChevronDown } from "lucide-react";
import { setAssignmentProgress } from "@/app/(app)/courses/[code]/actions";
import { StatusPill } from "@/components/assignments/status-pill";
import type { AssignmentStatus } from "@/lib/assignments/status";

type Progress = "not_started" | "in_progress";

const OPTIONS: { value: Progress; label: string }[] = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
];

// The status pill is the control for your own progress: pressing it offers Not started and In
// progress (Canvas owns Done). The change shows at once and settles when the server saves it. A
// deadline that's close or past still outranks progress in the pill, as everywhere else; the
// menu shows which progress is set.
export function ProgressMenu({ assignmentId, status, progress }: { assignmentId: string; status: AssignmentStatus; progress: Progress }) {
  const [shown, setShown] = useOptimistic(progress);
  const [, startTransition] = useTransition();
  const pill = status === "in_progress" || status === "not_started" ? shown : status;

  function choose(value: Progress) {
    if (value === shown) return;
    startTransition(async () => {
      setShown(value);
      const form = new FormData();
      form.set("assignmentId", assignmentId);
      form.set("progress", value);
      await setAssignmentProgress(form);
    });
  }

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={`Progress: ${OPTIONS.find((option) => option.value === shown)?.label}. Change`}
        className="press flex items-center gap-0.5 rounded-full focus-visible:outline-2 focus-visible:outline-ring"
      >
        <StatusPill status={pill} className="hover:bg-fill-tertiary" />
        <ChevronDown aria-hidden className="size-3.5 text-tertiary-foreground" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="end" sideOffset={6} className="z-50">
          <Menu.Popup className="min-w-40 origin-(--transform-origin) rounded-xl bg-popover p-1 text-popover-foreground shadow-sheet transition-[scale,opacity] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            <Menu.RadioGroup value={shown} onValueChange={(value) => {
                const option = OPTIONS.find((candidate) => candidate.value === value);
                if (option) choose(option.value);
              }}>
              {OPTIONS.map((option) => (
                <Menu.RadioItem
                  key={option.value}
                  value={option.value}
                  className="flex cursor-default items-center gap-2 rounded-lg py-1.5 pr-3 pl-2 text-sm outline-none select-none data-highlighted:bg-fill-secondary"
                >
                  <span className="flex size-4 items-center justify-center">
                    <Menu.RadioItemIndicator>
                      <Check aria-hidden className="size-4" />
                    </Menu.RadioItemIndicator>
                  </span>
                  {option.label}
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
