"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CircleAlert, GripVertical } from "lucide-react";
import { moveCourse } from "@/app/(app)/pathway/actions";
import { CourseCard } from "@/components/pathway/course-card";
import { TermColumn } from "@/components/pathway/term-column";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { checkMove, describeProblem, type PlanPrereq, type TermKind } from "@/lib/pathway/move-checks";
import { summarizeTerms, type PathwayCourse, type TermSummary } from "@/lib/pathway/summarize";
import { cn } from "@/lib/utils";

type Move = { courseId: string; termId: number };
type PendingMove = Move & { problems: string[] };

// The pathway as a drag-and-drop board. Planned courses move by their grip handle (pointer, touch
// or keyboard: Space to pick up, arrows to move, Space to drop). Each move is checked against
// prerequisites, co-op terms and term SH limits before it is saved; a clean move saves at once,
// a move with problems asks first. Clicking a card still opens its edit dialog.
export function PathwayBoard({ terms, prereqs }: { terms: TermSummary[]; prereqs: PlanPrereq[] }) {
  // Where each course is, as the server last said; moves show at once and settle when it confirms.
  const saved = useMemo(() => new Map(terms.flatMap((term) => term.courses.map((course) => [course.id, term.id] as const))), [terms]);
  const [placement, place] = useOptimistic(saved, (current, move: Move) => new Map(current).set(move.courseId, move.termId));
  const [, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overTermId, setOverTermId] = useState<number | null>(null);
  const [pending, setPending] = useState<PendingMove | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allCourses = useMemo(() => terms.flatMap((term) => term.courses), [terms]);
  const board = useMemo(
    () =>
      summarizeTerms(
        terms.map((term) => ({ ...term, courses: allCourses.filter((course) => placement.get(course.id) === term.id) })),
      ),
    [terms, allCourses, placement],
  );

  const plan = useMemo(
    () => ({
      terms: terms.map((term) => ({ id: term.id, name: term.name, kind: term.kind as TermKind })),
      courses: allCourses.map((course) => ({
        id: course.id,
        code: course.code,
        credits: Number(course.credits),
        type: course.type,
        termId: placement.get(course.id) ?? 0,
      })),
      prereqs,
    }),
    [terms, allCourses, placement, prereqs],
  );

  const termName = (id: number) => terms.find((term) => term.id === id)?.name ?? "that term";
  const codeOf = (id: string) => allCourses.find((course) => course.id === id)?.code ?? "The course";
  const problemsFor = (courseId: string, termId: number) =>
    checkMove(plan, courseId, termId).map((problem) => describeProblem(problem, termName(termId)));

  const sensors = useSensors(
    // A short distance before a drag starts, so a tap on the handle isn't a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  function commit(move: Move) {
    setError(null);
    startTransition(async () => {
      place(move);
      const result = await moveCourse(move);
      if (!result.ok) setError(`Could not move ${codeOf(move.courseId)}. Try again.`);
    });
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    setOverTermId(null);
    if (!over) return;
    const courseId = String(active.id);
    const termId = Number(over.id);
    if (placement.get(courseId) === termId) return;
    const problems = problemsFor(courseId, termId);
    if (problems.length === 0) commit({ courseId, termId });
    else setPending({ courseId, termId, problems });
  }

  // What screen readers hear while dragging with the keyboard.
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${codeOf(String(active.id))}.`,
    onDragOver: ({ active, over }) => {
      if (!over) return `${codeOf(String(active.id))} is not over a term.`;
      const problems = problemsFor(String(active.id), Number(over.id));
      return `${codeOf(String(active.id))} is over ${termName(Number(over.id))}. ${problems.length === 0 ? "No problems." : problems.join(" ")}`;
    },
    onDragEnd: ({ active, over }) =>
      over ? `${codeOf(String(active.id))} dropped on ${termName(Number(over.id))}.` : `${codeOf(String(active.id))} put back.`,
    onDragCancel: ({ active }) => `Moving ${codeOf(String(active.id))} was cancelled.`,
  };

  const preview = activeId !== null && overTermId !== null && placement.get(activeId) !== overTermId ? problemsFor(activeId, overTermId) : null;
  const activeCourse = activeId ? allCourses.find((course) => course.id === activeId) : undefined;
  const termOptions = terms.map(({ id, name }) => ({ id, name }));

  return (
    <>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {/* A fixed id, so dnd-kit's generated aria ids match between server and client renders. */}
      <DndContext
        id="pathway-board"
        sensors={sensors}
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable: "To move this course, press Space, use the arrow keys to choose a term, then press Space again. Press Escape to cancel.",
          },
        }}
        onDragStart={({ active }: DragStartEvent) => setActiveId(String(active.id))}
        onDragOver={({ over }: DragOverEvent) => setOverTermId(over ? Number(over.id) : null)}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          setActiveId(null);
          setOverTermId(null);
        }}
      >
        {/* Scrolls sideways inside its own box; focusable so keyboard users can scroll it too. It
            bleeds to the page edges and snaps to columns so a flick lands on a whole term.
            `relative` keeps the cards' absolutely positioned sr-only labels inside the scroll box. */}
        <ol
          aria-label="Terms"
          tabIndex={0}
          className="relative -mx-4 flex snap-x snap-proximity scroll-px-4 items-start gap-3 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:scroll-px-6 sm:px-6"
        >
          {board.map((term) => (
            <DroppableTerm
              key={term.id}
              term={term}
              preview={overTermId === term.id ? preview : null}
            >
              {term.courses.map((course) => (
                <li key={course.id}>
                  <DraggableCourse
                    course={course}
                    termId={term.id}
                    terms={termOptions}
                    past={term.phase === "past"}
                    checkTerm={(termId) => problemsFor(course.id, termId)}
                  />
                </li>
              ))}
            </DroppableTerm>
          ))}
        </ol>
        <DragOverlay>
          {activeCourse ? (
            <div className="w-60 rotate-1 rounded-xl bg-card p-3 text-sm font-semibold shadow-raised">{activeCourse.code}</div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <Dialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Move {pending ? codeOf(pending.courseId) : ""} to {pending ? termName(pending.termId) : ""}?
            </DialogTitle>
            <DialogDescription>This move breaks the plan&rsquo;s checks:</DialogDescription>
          </DialogHeader>
          <ul className="flex flex-col gap-1.5 text-sm">
            {pending?.problems.map((problem) => (
              <li key={problem} className="flex gap-2">
                <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-destructive" />
                {problem}
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (pending) commit(pending);
                setPending(null);
              }}
            >
              Move anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DroppableTerm({ term, preview, children }: { term: TermSummary; preview: string[] | null; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id: term.id });
  return (
    <TermColumn
      term={term}
      ref={setNodeRef}
      drop={preview === null ? null : preview.length === 0 ? "ok" : "problem"}
      notice={
        preview && preview.length > 0 ? (
          <ul className="flex flex-col gap-1 rounded-xl bg-card px-2.5 py-2 text-xs text-destructive shadow-card">
            {preview.map((problem) => (
              <li key={problem} className="flex gap-1.5">
                <CircleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
                {problem}
              </li>
            ))}
          </ul>
        ) : null
      }
    >
      {children}
    </TermColumn>
  );
}

function DraggableCourse({
  course,
  termId,
  terms,
  past,
  checkTerm,
}: {
  course: PathwayCourse;
  termId: number;
  terms: { id: number; name: string }[];
  past: boolean;
  checkTerm: (termId: number) => string[];
}) {
  // Done and in-progress courses are history; only planned ones move.
  const movable = course.status === "planned";
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({ id: course.id, disabled: !movable });

  return (
    <div ref={setNodeRef} className={cn("relative", isDragging && "opacity-40")}>
      <CourseCard course={course} termId={termId} terms={terms} past={past} checkTerm={checkTerm} />
      {movable && (
        <button
          ref={setActivatorNodeRef}
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Move ${course.code}`}
          className="absolute right-1.5 bottom-1.5 flex size-7 cursor-grab touch-none items-center justify-center rounded-lg text-tertiary-foreground hover:bg-fill-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring active:cursor-grabbing"
        >
          <GripVertical aria-hidden className="size-4" />
        </button>
      )}
    </div>
  );
}
