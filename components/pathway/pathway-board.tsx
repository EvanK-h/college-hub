"use client";

import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  defaultDropAnimationSideEffects,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type DropAnimation,
} from "@dnd-kit/core";
import { CircleAlert, GripVertical } from "lucide-react";
import { MotionConfig, motion, useReducedMotion } from "motion/react";
import { moveCourse } from "@/app/(app)/pathway/actions";
import { CourseCard, CourseCardBody } from "@/components/pathway/course-card";
import type { CourseDetails } from "@/components/pathway/edit-course-dialog";
import { TermColumn } from "@/components/pathway/term-column";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { coursePath } from "@/lib/courses/slug";
import { checkMove, describeProblem, prereqChecks, type CreditLimits, type PlanPrereq, type TermKind } from "@/lib/pathway/move-checks";
import { summarizeTerms, type PathwayCourse, type TermSummary } from "@/lib/pathway/summarize";
import { categoryClass, type CourseTypeInfo } from "@/lib/setup/setup";
import { cn } from "@/lib/utils";

type Move = { courseId: string; termId: number };
type PendingMove = Move & { problems: string[] };

// The card settles into its slot on the same critically damped curve as --ease-spring in
// globals.css; the Web Animations API that dnd-kit uses can't read a CSS variable.
const DROP_ANIMATION: DropAnimation = {
  duration: 300,
  easing:
    "linear(0, 0.058, 0.181, 0.321, 0.456, 0.574, 0.672, 0.751, 0.813, 0.861, 0.897, 0.924, 0.945, 0.96, 0.971, 0.979, 0.985, 0.989, 0.992, 0.994, 0.996, 0.997, 0.998, 0.999, 1)",
  sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: "0.4" } } }),
};

// The pathway as a drag-and-drop board. A planned course moves by dragging the card itself (after
// 6 px with a mouse, or a short press on touch, so a tap still opens its edit dialog) or from the
// keyboard by its grip: Space to pick up, arrows to move, Space to drop. Each move is checked
// against prerequisites, co-op terms and term credit limits before it is saved; a clean move saves
// at once, a move with problems asks first.
//
// The board opens on the current term, with finished terms folded to summaries. With
// `courseTypes`, a legend above it doubles as a filter: pressing a type dims every other card.
//
// What-if plans reuse the board with their own `onMove` (saving to the plan, not the courses)
// and `editable={false}`, since the edit dialog changes the real course. `labels` puts a chip on
// a card, such as "Swap for CS 4805". `requirements` names what each course counts towards, for the
// edit dialog. `limits` and `creditUnit` come from the profile.
export function PathwayBoard({
  terms,
  prereqs,
  limits,
  creditUnit,
  onMove = moveCourse,
  editable = true,
  labels = {},
  courseTypes,
  requirements = {},
}: {
  terms: TermSummary[];
  prereqs: PlanPrereq[];
  limits: CreditLimits;
  creditUnit: string;
  onMove?: (move: Move) => Promise<{ ok: boolean }>;
  editable?: boolean;
  labels?: Record<string, string>;
  courseTypes?: CourseTypeInfo[];
  requirements?: Record<string, string[]>;
}) {
  // Where each course is, as the server last said; moves show at once and settle when it confirms.
  const saved = useMemo(() => new Map(terms.flatMap((term) => term.courses.map((course) => [course.id, term.id] as const))), [terms]);
  const [placement, place] = useOptimistic(saved, (current, move: Move) => new Map(current).set(move.courseId, move.termId));
  const [, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overTermId, setOverTermId] = useState<number | null>(null);
  const [pending, setPending] = useState<PendingMove | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(new Set());
  const [highlight, setHighlight] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
  const scroller = useRef<HTMLOListElement>(null);

  // Open with the current term in view: if it starts off-screen, scroll it to the start.
  useEffect(() => {
    const list = scroller.current;
    const current = list?.querySelector<HTMLElement>('[aria-current="step"]');
    if (!list || !current || current.offsetLeft + current.offsetWidth <= list.clientWidth) return;
    list.scrollLeft = current.offsetLeft - parseFloat(getComputedStyle(list).scrollPaddingLeft || "0");
  }, []);

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
        coop: course.type.coop,
        termId: placement.get(course.id) ?? 0,
      })),
      prereqs,
      limits,
    }),
    [terms, allCourses, placement, prereqs, limits],
  );

  const termName = (id: number) => terms.find((term) => term.id === id)?.name ?? "that term";
  const codeOf = (id: string) => allCourses.find((course) => course.id === id)?.code ?? "The course";
  const problemsFor = (courseId: string, termId: number) =>
    checkMove(plan, courseId, termId).map((problem) => describeProblem(problem, termName(termId), creditUnit));

  const sensors = useSensors(
    // A short distance before a mouse drag starts, so a click still opens the card. On touch, a
    // short press picks the card up, so a swipe still scrolls the board.
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  function commit(move: Move) {
    setError(null);
    startTransition(async () => {
      place(move);
      const result = await onMove(move);
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
  const detailsFor = (course: PathwayCourse): CourseDetails => ({
    requirements: requirements[course.id] ?? [],
    prereqs: prereqChecks(plan, course.id),
    // Co-op placements are entries in the plan, not courses with a page.
    href: course.type.coop ? undefined : coursePath(course.code),
  });
  const toggle = (termId: number) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (!next.delete(termId)) next.add(termId);
      return next;
    });

  return (
    <>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {courseTypes && courseTypes.length > 1 && <LegendFilter types={courseTypes} highlight={highlight} onChange={setHighlight} />}
      {/* A fixed id, so dnd-kit's generated aria ids match between server and client renders. */}
      <DndContext
        id="pathway-board"
        sensors={sensors}
        // Scroll the board near its edges, gently: the defaults race past columns.
        autoScroll={{ acceleration: 6, threshold: { x: 0.12, y: 0.1 } }}
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
          ref={scroller}
          aria-label="Terms"
          tabIndex={0}
          className="relative -mx-4 flex snap-x snap-proximity scroll-px-4 items-start gap-3 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:scroll-px-6 sm:px-6"
        >
          {board.map((term) => (
            <DroppableTerm
              key={term.id}
              term={term}
              creditUnit={creditUnit}
              preview={overTermId === term.id ? preview : null}
              limit={limits[term.kind as TermKind]}
              // A finished term folds to a summary unless opened, or while a course is dragged over it.
              collapsed={term.phase === "past" && !expanded.has(term.id) && overTermId !== term.id}
              onToggle={term.phase === "past" ? () => toggle(term.id) : undefined}
            >
              {term.courses.map((course) => (
                <li key={course.id}>
                  <DraggableCourse
                    course={course}
                    termId={term.id}
                    terms={termOptions}
                    past={term.phase === "past"}
                    checkTerm={(termId) => problemsFor(course.id, termId)}
                    details={editable ? detailsFor(course) : undefined}
                    dimmed={highlight !== null && course.type.id !== highlight}
                    editable={editable}
                    label={labels[course.id]}
                    creditUnit={creditUnit}
                  />
                </li>
              ))}
            </DroppableTerm>
          ))}
        </ol>
        {/* The card you grabbed, lifted: same face, a little larger, a deeper shadow. */}
        <DragOverlay dropAnimation={reduceMotion ? null : DROP_ANIMATION}>
          {activeCourse ? (
            <MotionConfig reducedMotion="user">
              <motion.div initial={{ scale: 1 }} animate={{ scale: 1.03 }} transition={{ type: "spring", bounce: 0, duration: 0.25 }} className="cursor-grabbing">
                <CourseCardBody course={activeCourse} label={labels[activeCourse.id]} creditUnit={creditUnit} className="shadow-raised" />
              </motion.div>
            </MotionConfig>
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

/** The course types as pressable chips: pressing one dims the others; pressing it again clears it. */
function LegendFilter({ types, highlight, onChange }: { types: CourseTypeInfo[]; highlight: string | null; onChange: (id: string | null) => void }) {
  return (
    // One scrolling row on phones, wrapping from tablet width.
    <ul aria-label="Course types" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
      {types.map((type) => {
        const pressed = highlight === type.id;
        return (
          <li key={type.id} className="shrink-0">
            <button
              type="button"
              aria-pressed={pressed}
              onClick={() => onChange(pressed ? null : type.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                pressed ? "bg-foreground text-background" : "bg-fill-tertiary text-muted-foreground hover:bg-fill-secondary hover:text-foreground",
                highlight !== null && !pressed && "opacity-60",
                categoryClass(type.color),
              )}
            >
              <span aria-hidden className="size-2 rounded-full bg-(--course) ring-1 ring-card/60" />
              {type.name}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function DroppableTerm({
  term,
  creditUnit,
  preview,
  limit,
  collapsed,
  onToggle,
  children,
}: {
  term: TermSummary;
  creditUnit: string;
  preview: string[] | null;
  limit?: number;
  collapsed: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
}) {
  const { setNodeRef } = useDroppable({ id: term.id });
  return (
    <TermColumn
      term={term}
      creditUnit={creditUnit}
      limit={limit}
      collapsed={collapsed}
      onToggle={onToggle}
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
  details,
  dimmed,
  editable,
  label,
  creditUnit,
}: {
  course: PathwayCourse;
  termId: number;
  terms: { id: number; name: string }[];
  past: boolean;
  checkTerm: (termId: number) => string[];
  details?: CourseDetails;
  dimmed: boolean;
  editable: boolean;
  label?: string;
  creditUnit: string;
}) {
  // Done and in-progress courses are history; only planned ones move.
  const movable = course.status === "planned";
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({ id: course.id, disabled: !movable });
  // The whole card answers the mouse and touch; the grip is where the keyboard picks it up.
  const pick = (keyboard: boolean) => Object.fromEntries(Object.entries(listeners ?? {}).filter(([name]) => (name === "onKeyDown") === keyboard));

  return (
    <div
      ref={setNodeRef}
      {...(movable ? pick(false) : {})}
      className={cn(
        "relative transition-opacity",
        // No text selection or iOS callout while a press is becoming a drag.
        movable && "select-none [-webkit-touch-callout:none]",
        isDragging ? "opacity-40" : dimmed && "opacity-35",
      )}
    >
      {editable ? (
        <CourseCard course={course} termId={termId} terms={terms} past={past} checkTerm={checkTerm} details={details} creditUnit={creditUnit} />
      ) : (
        <CourseCardBody course={course} past={past} label={label} creditUnit={creditUnit} />
      )}
      {movable && (
        <button
          ref={setActivatorNodeRef}
          type="button"
          {...attributes}
          {...pick(true)}
          aria-label={`Move ${course.code}`}
          className="absolute right-1.5 bottom-1.5 flex size-7 cursor-grab touch-none items-center justify-center rounded-lg text-tertiary-foreground hover:bg-fill-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring active:cursor-grabbing"
        >
          <GripVertical aria-hidden className="size-4" />
        </button>
      )}
    </div>
  );
}
