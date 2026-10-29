"use client";

import { Plus } from "lucide-react";
import { NewPlanForm } from "@/components/plans/new-plan-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// "New plan" is the page's one primary action; the form opens over the list rather than sitting
// above it as a card.
export function NewPlanDialog({ plans }: { plans: { id: string; name: string }[] }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button />}>
        <Plus aria-hidden />
        New plan
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New plan</DialogTitle>
          <DialogDescription>Save a copy of your plan, or of another what-if plan, and open it.</DialogDescription>
        </DialogHeader>
        <NewPlanForm plans={plans} />
      </DialogContent>
    </Dialog>
  );
}
