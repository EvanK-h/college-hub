"use client";

import { useActionState } from "react";
import { linkCourse, type CourseLinkState } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { CanvasCourseOption } from "@/lib/canvas/course-links";

const SELECT_CLASS =
  "h-10 w-full min-w-0 rounded-xl border border-input bg-card px-3 text-sm focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/25 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-muted";

const IDLE: CourseLinkState = { status: "idle", message: "" };

// One small form per course, so each row saves on its own and works without JavaScript.
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
  const selectId = `canvas-course-${courseId}`;

  return (
    <form action={formAction} className="flex flex-col gap-1.5">
      <input type="hidden" name="courseId" value={courseId} />
      <div className="flex items-center gap-2">
        <Label htmlFor={selectId} className="sr-only">
          Canvas course for {courseCode}
        </Label>
        <select id={selectId} name="canvasCourseId" defaultValue={defaultValue} disabled={disabled} className={SELECT_CLASS}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline" disabled={disabled || pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
      {/* Always rendered, so screen readers hear the result when it appears. */}
      <p
        role={state.status === "error" ? "alert" : "status"}
        className={state.status === "error" ? "text-sm text-destructive" : "text-xs text-muted-foreground"}
      >
        {state.message || (suggested ? "Suggested from the course code. Save to link it." : "")}
      </p>
    </form>
  );
}
