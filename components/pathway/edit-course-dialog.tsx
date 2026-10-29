"use client";

import { useActionState, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, CircleAlert, CircleCheck } from "lucide-react";
import { updateCourse, type CourseUpdateState } from "@/app/(app)/pathway/actions";
import { StatusIcon } from "@/components/pathway/status-icon";
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
import { NATIVE_SELECT_CLASS as SELECT_CLASS } from "@/components/ui/native-select";
import { COURSE_STATUS_LABELS, type CourseStatus } from "@/lib/pathway/labels";
import type { PrereqCheck } from "@/lib/pathway/move-checks";

type EditableCourse = { id: string; code: string; title: string; status: CourseStatus; termId: number };

/** What the dialog says about the course besides its status and term. */
export type CourseDetails = { requirements: string[]; prereqs: PrereqCheck[]; href?: string };

const IDLE: CourseUpdateState = { status: "idle", message: "" };
const STATUSES = Object.keys(COURSE_STATUS_LABELS) as CourseStatus[];

// The trigger is whatever the server renders as `children` (the course card), so the card
// itself can stay a Server Component. The dialog grows out of the card that opened it: its
// transform origin is set from the card's position, so it reads as the card opening.
export function EditCourseDialog({
  course,
  terms,
  checkTerm,
  details,
  children,
}: {
  course: EditableCourse;
  terms: { id: number; name: string }[];
  checkTerm?: (termId: number) => string[];
  details?: CourseDetails;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [termId, setTermId] = useState(course.termId);
  const [origin, setOrigin] = useState<string>();
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
            onClick={(event) => {
              // The popup is centred in the viewport, so the card's offset from the centre is
              // where, relative to the popup's own centre, it should grow from.
              const rect = event.currentTarget.getBoundingClientRect();
              const dx = rect.left + rect.width / 2 - window.innerWidth / 2;
              const dy = rect.top + rect.height / 2 - window.innerHeight / 2;
              setOrigin(`calc(50% + ${Math.round(dx)}px) calc(50% + ${Math.round(dy)}px)`);
            }}
          />
        }
      >
        {children}
      </DialogTrigger>
      <DialogContent style={{ transformOrigin: origin }} className="data-ending-style:scale-75 data-starting-style:scale-50">
        <DialogHeader>
          <DialogTitle>{course.code}</DialogTitle>
          <DialogDescription>{course.title}</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="courseId" value={course.id} />
          <fieldset className="grid gap-1.5">
            <legend className="mb-1.5 text-sm font-medium">Status</legend>
            {/* Three radios drawn as a segmented control: one tap, and each shows its status shape. */}
            <div className="grid grid-cols-3 gap-0.5 rounded-xl bg-fill-tertiary p-0.5">
              {STATUSES.map((status) => (
                <label
                  key={status}
                  className="flex cursor-pointer items-center justify-center gap-1.5 rounded-[0.625rem] px-2 py-1.5 text-sm font-medium text-muted-foreground has-checked:bg-card has-checked:text-foreground has-checked:shadow-card has-focus-visible:outline-2 has-focus-visible:outline-ring"
                >
                  <input type="radio" name="status" value={status} defaultChecked={course.status === status} className="sr-only" />
                  <StatusIcon status={status} className="size-4 shrink-0" />
                  <span aria-hidden>{COURSE_STATUS_LABELS[status]}</span>
                </label>
              ))}
            </div>
          </fieldset>
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
          {details && <Details details={details} />}
          {state.status === "error" && (
            <p role="alert" className="text-sm text-destructive">
              {state.message}
            </p>
          )}
          <DialogFooter className="items-center">
            {details?.href && (
              <Link
                href={details.href}
                className="mr-auto flex items-center gap-1 rounded-md text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
              >
                Course page
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            )}
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** What the course counts towards and what it needs, as the plan stands. */
function Details({ details }: { details: CourseDetails }) {
  const { requirements, prereqs } = details;
  if (requirements.length === 0 && prereqs.length === 0) return null;
  const anyOf = (codes: string[]) => (codes.length === 1 ? codes[0] : `One of ${codes.join(", ")}`);

  return (
    <dl className="grid gap-3 rounded-xl bg-fill-tertiary p-3 text-sm">
      {requirements.length > 0 && (
        <div className="grid gap-1">
          <dt className="text-xs font-medium text-muted-foreground">Counts towards</dt>
          <dd>{requirements.join(", ")}</dd>
        </div>
      )}
      {prereqs.length > 0 && (
        <div className="grid gap-1">
          <dt className="text-xs font-medium text-muted-foreground">Needs</dt>
          <dd>
            <ul className="grid gap-1">
              {prereqs.map((check) => (
                <li key={`${check.kind}-${check.options.join()}`} className="flex gap-1.5">
                  {check.met ? (
                    <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-status-done" />
                  ) : (
                    <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-destructive" />
                  )}
                  <span>
                    {anyOf(check.options)}
                    <span className="text-muted-foreground">
                      {check.kind === "coreq" ? " in the same term or earlier" : " in an earlier term"}
                      {check.met ? "" : " (not yet in the plan there)"}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </dd>
        </div>
      )}
    </dl>
  );
}
