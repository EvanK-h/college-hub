"use client";

import { useActionState, useId } from "react";
import { saveCourseNotes, type NotesState } from "@/app/(app)/courses/[code]/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const IDLE: NotesState = { status: "idle", message: "" };

export function NotesForm({ courseId, notes }: { courseId: string; notes: string | null }) {
  const id = useId();
  const [state, formAction, pending] = useActionState(saveCourseNotes, IDLE);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="courseId" value={courseId} />
      <Label htmlFor={id} className="sr-only">
        Notes
      </Label>
      <textarea
        id={id}
        name="notes"
        defaultValue={notes ?? ""}
        rows={5}
        maxLength={10_000}
        placeholder="Office hours, exam rooms, what to revise…"
        className="w-full resize-y rounded-xl border border-input bg-card px-3 py-2 text-sm focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/25 focus-visible:outline-none dark:bg-muted"
      />
      <div className="flex items-center justify-between gap-3">
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={state.status === "error" ? "text-sm text-destructive" : "text-sm text-muted-foreground"}
        >
          {state.message}
        </p>
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? "Saving…" : "Save notes"}
        </Button>
      </div>
    </form>
  );
}
