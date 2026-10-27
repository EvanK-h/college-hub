"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { addTodo, type TodoFormState } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
        <Label htmlFor={`${id}-due`} className="sr-only">
          Due date
        </Label>
        <input id={`${id}-due`} name="dueOn" type="date" className={`${FIELD_CLASS} min-w-0 flex-1`} />
      </div>
      {state.status === "error" && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
    </form>
  );
}
