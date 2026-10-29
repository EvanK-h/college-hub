"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { addTodo, type TodoFormState } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDay } from "@/lib/timetable/format";
import { cn } from "@/lib/utils";

const IDLE: TodoFormState = { status: "idle", message: "" };
const FIELD_CLASS =
  "h-9 rounded-xl border border-input bg-card px-2.5 text-sm focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/25 focus-visible:outline-none dark:bg-muted";

export function AddTodoForm({ courses }: { courses: { id: string; code: string }[] }) {
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(addTodo, IDLE);

  // Clear the form after each successful add, ready for the next one.
  useEffect(() => {
    if (state.status === "saved") formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Label htmlFor={`${id}-title`} className="sr-only">
          New to-do
        </Label>
        <Input id={`${id}-title`} name="title" placeholder="Add a to-do" maxLength={200} required className="h-9 flex-1" />
        <Button type="submit" size="sm" disabled={pending} className="h-9">
          Add
        </Button>
      </div>
      <div className="flex gap-2">
        <Label htmlFor={`${id}-course`} className="sr-only">
          Course
        </Label>
        <select id={`${id}-course`} name="courseId" defaultValue="" className={`${FIELD_CLASS} min-w-0 flex-1`}>
          <option value="">No course</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.code}
            </option>
          ))}
        </select>
        <DueDateField className={`${FIELD_CLASS} min-w-0 flex-1`} />
      </div>
      {state.status === "error" && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
    </form>
  );
}

// A native date input formats its value in the browser's locale (mm/dd/yyyy in a US browser)
// whatever the page's language, so the field shows the date the app's way ("Fri 6 Nov") and
// opens the native picker from a hidden input, which is also what the form submits.
function DueDateField({ className }: { className: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [due, setDue] = useState("");

  // The value lives in state, so it has to follow the form's reset after an add.
  useEffect(() => {
    const form = input.current?.form;
    const clear = () => setDue("");
    form?.addEventListener("reset", clear);
    return () => form?.removeEventListener("reset", clear);
  }, []);

  function open() {
    try {
      input.current?.showPicker();
    } catch {
      // No showPicker (older browsers): focusing the input opens its picker on touch devices.
      input.current?.focus();
    }
  }

  return (
    <div className="relative flex min-w-0 flex-1">
      <button type="button" onClick={open} className={cn(className, "text-left", !due && "text-tertiary-foreground dark:text-muted-foreground", due && "pr-8")}>
        {due ? (
          <>
            <span className="sr-only">Due </span>
            {formatDay(new Date(`${due}T12:00:00Z`), "UTC")}
          </>
        ) : (
          "Due date"
        )}
      </button>
      {due && (
        <button
          type="button"
          onClick={() => setDue("")}
          aria-label="Clear the due date"
          className="absolute top-1/2 right-1.5 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-fill-secondary hover:text-foreground"
        >
          <X aria-hidden className="size-3.5" />
        </button>
      )}
      <input
        ref={input}
        name="dueOn"
        type="date"
        value={due}
        onChange={(event) => setDue(event.target.value)}
        tabIndex={-1}
        aria-hidden
        className="sr-only bottom-0 left-0"
      />
    </div>
  );
}
