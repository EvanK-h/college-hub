"use client";

import { useRef, useState, type ReactNode } from "react";
import { DECELERATION, project, rubberband } from "@/lib/motion/physics";
import { cn } from "@/lib/utils";

export type SwipeAction = {
  label: string;
  icon: ReactNode;
  /** Background and text colour of the revealed action. */
  tone: string;
  onSwipe: () => void;
  /** The row stays after the action (marking read) rather than leaving (done, delete). */
  stays?: boolean;
};

// Past this share of the row's width (where the flick projects it), a swipe commits.
const COMMIT_AT = 0.4;
// Movement before a touch picks a direction, so a scroll doesn't nudge the row sideways.
const SLOP = 10;

/**
 * Swipe actions for a row on touch screens, the Mail way: swipe right for `start`, left for
 * `end`. The row tracks the finger 1:1 once the touch has clearly gone sideways (vertical
 * scrolling stays native, `touch-action: pan-y`). The action shows underneath and its icon grows
 * once letting go would commit. On release the flick is projected forward: past 40% of the
 * width, the row slides away and the action runs; otherwise it springs back. A side with no
 * action rubber-bands. Mouse and keyboard use the row's own buttons; this is an extra for touch.
 */
export function SwipeRow({ start, end, children, className }: { start?: SwipeAction; end?: SwipeAction; children: ReactNode; className?: string }) {
  const row = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ x: number; y: number; horizontal: boolean | null; samples: { x: number; t: number }[] } | null>(null);
  const swiped = useRef(false);
  const [offset, setOffset] = useState(0);
  const [settling, setSettling] = useState(false);
  // Measured when a touch starts, so render never reads the DOM.
  const [width, setWidth] = useState(1);
  const action = offset > 0 ? start : offset < 0 ? end : undefined;
  const armed = action !== undefined && Math.abs(offset) > width * COMMIT_AT;

  function release(velocity: number) {
    const dx = offset;
    const chosen = dx > 0 ? start : dx < 0 ? end : undefined;
    const landing = dx + project(velocity, DECELERATION);
    setSettling(true);
    if (chosen && Math.sign(landing) === Math.sign(dx) && Math.abs(landing) > width * COMMIT_AT) {
      if (chosen.stays) {
        chosen.onSwipe();
        setOffset(0);
      } else {
        setOffset(Math.sign(dx) * width);
        setTimeout(chosen.onSwipe, 200);
      }
      return;
    }
    setOffset(0);
  }

  return (
    // Clipped only while moving, so at rest focus rings and widened tap targets aren't cut off.
    <div ref={row} className={cn("relative", (offset !== 0 || settling) && "overflow-hidden", className)}>
      {action && (
        <div
          aria-hidden
          className={cn("absolute inset-0 flex items-center px-5 text-sm font-semibold", offset > 0 ? "justify-start" : "justify-end", action.tone)}
        >
          <span className={cn("flex items-center gap-2 transition-transform duration-150", armed ? "scale-110" : "scale-90 opacity-80")}>
            {action.icon}
            {action.label}
          </span>
        </div>
      )}
      <div
        className={cn("relative touch-pan-y bg-card", settling && "transition-[translate] duration-300 ease-spring")}
        style={{ translate: `${offset}px 0` }}
        onTransitionEnd={() => setSettling(false)}
        onPointerDown={(event) => {
          if (event.pointerType !== "touch") return;
          swiped.current = false;
          setSettling(false);
          setWidth(row.current?.offsetWidth ?? 1);
          gesture.current = { x: event.clientX, y: event.clientY, horizontal: null, samples: [{ x: event.clientX, t: event.timeStamp }] };
        }}
        onPointerMove={(event) => {
          const current = gesture.current;
          if (!current) return;
          const dx = event.clientX - current.x;
          const dy = event.clientY - current.y;
          if (current.horizontal === null) {
            if (Math.abs(dy) > SLOP && Math.abs(dy) > Math.abs(dx)) current.horizontal = false;
            else if (Math.abs(dx) > SLOP) {
              current.horizontal = true;
              swiped.current = true;
              event.currentTarget.setPointerCapture(event.pointerId);
            }
          }
          if (!current.horizontal) return;
          current.samples = [...current.samples, { x: event.clientX, t: event.timeStamp }].filter((sample) => event.timeStamp - sample.t < 100);
          // A side with nothing to do resists.
          const has = dx > 0 ? start : end;
          setOffset(has ? dx : rubberband(dx, width) * 0.3);
        }}
        onPointerUp={(event) => {
          const current = gesture.current;
          gesture.current = null;
          if (!current?.horizontal) return;
          const first = current.samples[0];
          const elapsed = first ? event.timeStamp - first.t : 0;
          release(first && elapsed > 0 ? ((event.clientX - first.x) / elapsed) * 1000 : 0);
        }}
        onPointerCancel={() => {
          gesture.current = null;
          setSettling(true);
          setOffset(0);
        }}
        // A swipe shouldn't also count as a tap on whatever it started on.
        onClickCapture={(event) => {
          if (!swiped.current) return;
          swiped.current = false;
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        {children}
      </div>
    </div>
  );
}
