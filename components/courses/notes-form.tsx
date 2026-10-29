"use client";

import { useActionState, useEffect, useId, useRef, useState, useTransition } from "react";
import { saveCourseNotes, type NotesState } from "@/app/(app)/courses/[code]/actions";
import { Label } from "@/components/ui/label";

const IDLE: NotesState = { status: "idle", message: "" };
// How long typing has to pause before the notes save.
const SAVE_AFTER_MS = 800;

// Notes save themselves, the Apple Notes way: a pause in typing (or leaving the box) saves them,
// and a quiet line says so. There's no Save button to forget.
export function NotesForm({ courseId, notes }: { courseId: string; notes: string | null }) {
  const id = useId();
  const [state, save, saving] = useActionState(saveCourseNotes, IDLE);
  const [, startTransition] = useTransition();
  const [dirty, setDirty] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function flush() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (!form.current) return;
    const data = new FormData(form.current);
    setDirty(false);
    startTransition(() => save(data));
  }
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const message = saving ? "Saving…" : dirty ? "" : state.message;

  return (
    <form
      ref={form}
      action={save}
      onSubmit={(event) => {
        event.preventDefault();
        flush();
      }}
      className="flex flex-col gap-2"
    >
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
        onChange={() => {
          setDirty(true);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(flush, SAVE_AFTER_MS);
        }}
        onBlur={() => timer.current && flush()}
        className="w-full resize-y rounded-xl border border-input bg-card px-3 py-2 text-sm placeholder:text-tertiary-foreground dark:placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/25 focus-visible:outline-none dark:bg-muted"
      />
      <p
        role={state.status === "error" ? "alert" : "status"}
        className={state.status === "error" ? "text-sm text-destructive" : "min-h-5 text-xs text-tertiary-foreground"}
      >
        {message}
      </p>
    </form>
  );
}
