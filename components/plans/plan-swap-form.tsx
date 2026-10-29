"use client";

import { useActionState } from "react";
import { addPlanSwap, type PlanFormState } from "@/app/(app)/pathway/plans/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NATIVE_SELECT_CLASS } from "@/components/ui/native-select";

const IDLE: PlanFormState = { status: "idle", message: "" };

export type SwapChoiceGroup = { label: string; choices: { value: string; label: string }[] };

// Takes a swap option into the plan in place of one of the courses it can replace. Choices are
// grouped by slot, one entry per (swap, course it replaces) pair.
export function PlanSwapForm({ planId, groups }: { planId: string; groups: SwapChoiceGroup[] }) {
  const [state, formAction, pending] = useActionState(addPlanSwap, IDLE);

  if (groups.length === 0) return <p className="text-sm text-muted-foreground">No more swaps fit this plan.</p>;

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
      <input type="hidden" name="planId" value={planId} />
      <div className="grid gap-1.5">
        <Label htmlFor="swap-choice">Swap</Label>
        <select id="swap-choice" name="choice" required defaultValue="" className={NATIVE_SELECT_CLASS} aria-describedby="swap-error">
          <option value="" disabled>
            Choose a swap…
          </option>
          {groups.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.choices.map((choice) => (
                <option key={choice.value} value={choice.value}>
                  {choice.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Try it"}
      </Button>
      <p id="swap-error" role="alert" className="text-sm text-destructive sm:col-span-2 empty:hidden">
        {state.status === "error" ? state.message : ""}
      </p>
    </form>
  );
}
