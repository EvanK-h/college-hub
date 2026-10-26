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
  children,
}: {
  course: EditableCourse;
  terms: { id: number; name: string }[];
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  // Close the dialog once a save succeeds; errors stay open so the message can be read.
  async function save(previous: CourseUpdateState, formData: FormData) {
    const result = await updateCourse(previous, formData);
    if (result.status === "saved") setOpen(false);
    return result;
  }
  const [state, formAction, pending] = useActionState(save, IDLE);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
            <select id={`term-${course.id}`} name="termId" defaultValue={course.termId} className={SELECT_CLASS}>
              {terms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name}
                </option>
              ))}
            </select>
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
