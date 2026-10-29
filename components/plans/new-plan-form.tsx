"use client";

import { useActionState } from "react";
import { createPlan, type PlanFormState } from "@/app/(app)/pathway/plans/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NATIVE_SELECT_CLASS } from "@/components/ui/native-select";

const IDLE: PlanFormState = { status: "idle", message: "" };

// Saves a copy of the real plan, or of another plan, and opens it.
export function NewPlanForm({ plans }: { plans: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createPlan, IDLE);

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <div className="grid gap-1.5">
        <Label htmlFor="plan-name">Name</Label>
        <Input id="plan-name" name="name" required maxLength={60} placeholder="e.g. CY 4770 instead of CS 4805" aria-describedby="plan-error" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="plan-from">Start from</Label>
        <select id="plan-from" name="from" defaultValue="current" className={NATIVE_SELECT_CLASS}>
          <option value="current">The current plan</option>
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save a copy"}
      </Button>
      <p id="plan-error" role="alert" className="text-sm text-destructive sm:col-span-3 empty:hidden">
        {state.status === "error" ? state.message : ""}
      </p>
    </form>
  );
}
