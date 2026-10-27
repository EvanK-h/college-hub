"use client";

import { useActionState, useState, type ReactNode } from "react";
import { updateCourse, type CourseUpdateState } from "@/app/(app)/pathway/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { COURSE_STATUS_LABELS, type CourseStatus } from "@/lib/pathway/labels";

const SELECT_CLASS =
  "h-10 w-full rounded-xl border border-input bg-card px-3 text-sm focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/25 focus-visible:outline-none dark:bg-muted";

type EditableCourse = { id: string; code: string; title: string; status: CourseStatus; termId: number };

const IDLE: CourseUpdateState = { status: "idle", message: "" };

// The trigger is whatever the server renders as `children` (the course card), so the card
// itself can stay a Server Component.
export function EditCourseDialog({
  course,
  terms,
  checkTerm,
  children,
}: {
  course: EditableCourse;
  terms: { id: number; name: string }[];
  checkTerm?: (termId: number) => string[];
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [termId, setTermId] = useState(course.termId);
  // Same checks as dragging, for a planned course moved to another term. Advice, not a block.
  const problems = checkTerm && course.status === "planned" && termId !== course.termId ? checkTerm(termId) : [];

  // Close the dialog once a save succeeds; errors stay open so the message can be read.
  async function save(previous: CourseUpdateState, formData: FormData) {
    const result = await updateCourse(previous, formData);
    if (result.status === "saved") setOpen(false);
    return result;
  }
  const [state, formAction, pending] = useActionState(save, IDLE);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Each opening starts from where the course is now.
        if (next) setTermId(course.termId);
        setOpen(next);
      }}
    >
      <DialogTrigger
        render={
          <button
            type="button"
            className="press group/course w-full rounded-xl text-left"
          />
        }
      >
        {children}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{course.code}</DialogTitle>
          <DialogDescription>{course.title}</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="courseId" value={course.id} />
          <div className="grid gap-1.5">
            <Label htmlFor={`status-${course.id}`}>Status</Label>
            <select id={`status-${course.id}`} name="status" defaultValue={course.status} className={SELECT_CLASS}>
              {Object.entries(COURSE_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`term-${course.id}`}>Term</Label>
            <select
              id={`term-${course.id}`}
              name="termId"
              value={termId}
              onChange={(event) => setTermId(Number(event.target.value))}
              aria-describedby={problems.length > 0 ? `term-problems-${course.id}` : undefined}
              className={SELECT_CLASS}
            >
              {terms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name}
                </option>
              ))}
            </select>
            {problems.length > 0 && (
              <ul id={`term-problems-${course.id}`} className="flex flex-col gap-1 text-sm text-destructive">
                {problems.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            )}
          </div>
          {state.status === "error" && (
            <p role="alert" className="text-sm text-destructive">
              {state.message}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
