"use client";

import { useActionState, useRef, useState } from "react";
import { CircleCheck } from "lucide-react";
import { linkCourse, type CourseLinkState } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { CanvasCourseOption } from "@/lib/canvas/course-links";

const SELECT_CLASS =
  "h-10 w-full min-w-0 rounded-xl border border-input bg-card px-3 text-sm focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/25 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-muted";

const IDLE: CourseLinkState = { status: "idle", message: "" };

// One small form per course. Picking a Canvas course saves it at once, with a ✓ or the error
// beside it, so there's no row of Save buttons. The full Canvas name shows under the select, which
// truncates it. A suggestion made from the course code isn't saved until you confirm it with
// "Link it". Saving on change needs JavaScript; this is a private app, always run with it.
export function CourseLinkForm({
  courseId,
  courseCode,
  options,
  defaultValue,
  suggested,
  disabled,
}: {
  courseId: string;
  courseCode: string;
  options: CanvasCourseOption[];
  /** The linked Canvas course, or the suggested match, or "" for none. */
  defaultValue: string;
  /** True when `defaultValue` is only a guess from the course code and hasn't been saved. */
  suggested: boolean;
  disabled: boolean;
}) {
  const [state, formAction, pending] = useActionState(linkCourse, IDLE);
  const [value, setValue] = useState(defaultValue);
  const [touched, setTouched] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const selectId = `canvas-course-${courseId}`;
  const label = options.find((option) => option.value === value)?.label;
  const unconfirmed = suggested && !touched && state.status !== "saved";

  return (
    <form ref={form} action={formAction} className="flex flex-col gap-1.5">
      <input type="hidden" name="courseId" value={courseId} />
      <div className="flex items-center gap-2">
        <Label htmlFor={selectId} className="sr-only">
          Canvas course for {courseCode}
        </Label>
        <select
          id={selectId}
          name="canvasCourseId"
          value={value}
          disabled={disabled}
          onChange={(event) => {
            setValue(event.target.value);
            setTouched(true);
            form.current?.requestSubmit();
          }}
          className={SELECT_CLASS}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {unconfirmed && (
          <Button type="submit" variant="outline" disabled={disabled || pending}>
            Link it
          </Button>
        )}
      </div>
      {/* Always rendered, so screen readers hear the result when it appears. */}
      <p
        role={state.status === "error" ? "alert" : "status"}
        className={state.status === "error" ? "text-sm text-destructive" : "flex items-start gap-1 text-xs text-muted-foreground"}
      >
        {state.status === "error" ? (
          state.message
        ) : pending ? (
          "Saving…"
        ) : (
          <>
            {state.status === "saved" && <CircleCheck aria-hidden className="mt-px size-3.5 shrink-0 text-status-done" />}
            <span>
              {unconfirmed ? `Suggested from the course code: ${label}.` : value !== "" ? label : state.status === "saved" ? "Unlinked." : ""}
              {state.status === "saved" && value !== "" && <span className="sr-only"> Saved.</span>}
            </span>
          </>
        )}
      </p>
    </form>
  );
}
