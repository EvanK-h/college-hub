"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { CircleAlert, Maximize2, Minimize2 } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { StatusIcon } from "@/components/pathway/status-icon";
import { DECELERATION, project, rubberband } from "@/lib/motion/physics";
import { ancestors, chainTo, descendants, type GraphEdge, type GraphNode, type PrereqGraph } from "@/lib/pathway/graph";
import { categoryClass } from "@/lib/setup/setup";
import { cn } from "@/lib/utils";

const NODE_W = 168;
const NODE_H = 58;
const COL_GAP = 72;
const ROW_GAP = 14;
const HEADER_H = 36;

const KIND_LABEL: Record<GraphEdge["kind"], string> = {
  prereq: "prerequisite",
  coreq: "corequisite",
  recommended: "recommended",
};

// Dashes tell the kinds apart without colour: solid for a prerequisite, dotted for a corequisite,
// dashed for advice.
const KIND_DASH: Record<GraphEdge["kind"], string | undefined> = {
  prereq: undefined,
  coreq: "1 4",
  recommended: "6 4",
};

const x = (node: GraphNode) => node.column * (NODE_W + COL_GAP);
const y = (node: GraphNode) => HEADER_H + node.row * (NODE_H + ROW_GAP);

// From the right edge of the required course to the left edge of the one that needs it. Two
// courses in the same term (a lab and its lecture) are joined by a loop out to the right instead.
function edgePath(from: GraphNode, to: GraphNode): string {
  const y1 = y(from) + NODE_H / 2;
  const y2 = y(to) + NODE_H / 2;
  if (from.column === to.column) {
    const x1 = x(from) + NODE_W;
    return `M ${x1} ${y1} C ${x1 + 32} ${y1}, ${x1 + 32} ${y2}, ${x1} ${y2}`;
  }
  const x1 = x(from) + NODE_W;
  const x2 = x(to) - 4; // leave room for the arrowhead
  const bend = Math.max(36, Math.abs(x2 - x1) / 2);
  return `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`;
}

// The plan as a graph: one column per term, arrows from each requirement to the course that needs
// it. Selecting a course (click, or Enter on the keyboard) lights up everything it depends on and
// everything it unlocks, and the panel underneath says the same in words. With a mouse, hovering
// lights a course up the same way, so a chain can be explored without clicking every node.
//
// The canvas pans by dragging its background, and a flick carries on and slows to a stop.
// "Fit to width" scales the whole graph to the screen to show its shape.
//
// `chains` are the focuses with a goal course (e.g. Quantum → PHYS 5352). One at a time can be
// shaded: the goal and everything it depends on. The first is shaded to begin with.
export function PrereqGraphView({ graph, chains }: { graph: PrereqGraph; chains: { name: string; goal: string }[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [chainIndex, setChainIndex] = useState<number | null>(chains.length > 0 ? 0 : null);
  const [fit, setFit] = useState(false);
  const [available, setAvailable] = useState<number | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const pan = usePan(scroller, canvas);

  // The room the graph has, for fitting it to the width.
  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setAvailable(element.clientWidth - parseFloat(getComputedStyle(element).paddingLeft) * 2));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const byId = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph.nodes]);
  const goal = chainIndex === null ? null : (chains[chainIndex]?.goal ?? null);
  const chain = useMemo(() => (goal ? chainTo(goal, graph.nodes, graph.edges) : new Set<string>()), [goal, graph.nodes, graph.edges]);
  // A selection wins over a hover, so moving the mouse doesn't lose what you clicked.
  const focused = selected ?? hovered;
  const related = useMemo(
    () => (focused ? new Set([focused, ...ancestors(focused, graph.edges), ...descendants(focused, graph.edges)]) : null),
    [focused, graph.edges],
  );

  const rows = Math.max(0, ...graph.nodes.map((node) => node.row + 1));
  const width = graph.columns.length * NODE_W + Math.max(0, graph.columns.length - 1) * COL_GAP + 40;
  const height = HEADER_H + rows * (NODE_H + ROW_GAP);
  const inChain = (edge: GraphEdge) => chain.has(edge.from) && chain.has(edge.to);
  const lit = (edge: GraphEdge) => (related ? related.has(edge.from) && related.has(edge.to) : false);
  const problems = graph.edges.filter((edge) => edge.problem);
  const scale = available !== null && available < width ? available / width : 1;
  const shown = fit ? scale : 1;

  if (graph.nodes.length === 0) {
    return <p className="text-muted-foreground">No prerequisites yet. Run the prerequisite import to fill the graph.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Legend />
        <div className="flex flex-wrap items-center gap-2">
          {chains.length > 0 && (
            <div role="group" aria-label="Shade a chain" className="flex flex-wrap gap-2">
              {chains.map((option, index) => (
                <button
                  key={option.name}
                  type="button"
                  aria-pressed={chainIndex === index}
                  onClick={() => setChainIndex((current) => (current === index ? null : index))}
                  className={cn(
                    "press rounded-full px-3 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring",
                    chainIndex === index ? "bg-accent text-accent-foreground" : "bg-fill-secondary text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option.name} chain
                </button>
              ))}
            </div>
          )}
          {scale < 1 && (
            <button
              type="button"
              aria-pressed={fit}
              onClick={() => setFit((current) => !current)}
              className="press flex items-center gap-1.5 rounded-full bg-fill-secondary px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              {fit ? <Minimize2 aria-hidden className="size-4" /> : <Maximize2 aria-hidden className="size-4" />}
              {fit ? "Actual size" : "Fit to width"}
            </button>
          )}
        </div>
      </div>

      {/* Scrolls sideways in its own box, like the board; focusable so the keyboard can scroll it,
          and draggable by its background with a mouse. */}
      <div
        ref={scroller}
        tabIndex={0}
        aria-label="Prerequisite graph"
        role="group"
        {...pan}
        className={cn("-mx-4 overflow-x-auto px-4 pb-2 edge-fade-x sm:-mx-6 sm:px-6", shown === 1 && "cursor-grab active:cursor-grabbing")}
      >
        <div ref={canvas} style={{ width: width * shown, height: height * shown }}>
          <div className="relative origin-top-left" style={{ width, height, transform: shown === 1 ? undefined : `scale(${shown})` }}>
            {graph.columns.map((term, column) => (
              <h2
                key={term.id}
                className="absolute top-0 truncate px-1 text-sm font-semibold text-muted-foreground"
                style={{ left: column * (NODE_W + COL_GAP), width: NODE_W }}
              >
                {term.name}
              </h2>
            ))}

            {/* The arrows are drawing only; the panel below carries the same links as text. */}
            <svg aria-hidden className="pointer-events-none absolute inset-0 overflow-visible" width={width} height={height}>
              <defs>
                <marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto">
                  <path d="M 0 0 L 8 4 L 0 8 z" fill="context-stroke" />
                </marker>
              </defs>
              {graph.edges.map((edge) => {
                const from = byId.get(edge.from);
                const to = byId.get(edge.to);
                if (!from || !to) return null;
                const strong = lit(edge) || inChain(edge);
                return (
                  <path
                    key={edge.id}
                    d={edgePath(from, to)}
                    fill="none"
                    strokeDasharray={KIND_DASH[edge.kind]}
                    strokeLinecap="round"
                    markerEnd={from.column === to.column ? undefined : "url(#arrow)"}
                    className={cn(
                      "transition-opacity",
                      edge.problem
                        ? "stroke-destructive"
                        : lit(edge)
                          ? "stroke-foreground"
                          : inChain(edge)
                            ? "stroke-accent-foreground"
                            : "stroke-tertiary-foreground",
                      strong ? "[stroke-width:2.25]" : edge.alternative ? "[stroke-width:1]" : "[stroke-width:1.5]",
                      related && !lit(edge) && "opacity-20",
                    )}
                  />
                );
              })}
            </svg>

            {graph.nodes.map((node) => (
              <button
                key={node.id}
                type="button"
                aria-pressed={selected === node.id}
                onClick={() => setSelected((current) => (current === node.id ? null : node.id))}
                onPointerEnter={(event) => event.pointerType === "mouse" && setHovered(node.id)}
                onPointerLeave={() => setHovered((current) => (current === node.id ? null : current))}
                className={cn(
                  "absolute flex gap-2 rounded-xl p-2 text-left shadow-card transition-opacity focus-visible:outline-2 focus-visible:outline-ring",
                  chain.has(node.id) ? "bg-accent ring-1 ring-accent-foreground/30 ring-inset" : "bg-card",
                  selected === node.id && "ring-2 ring-ring ring-inset",
                  related && !related.has(node.id) && "opacity-35",
                  categoryClass(node.color),
                )}
                style={{ left: x(node), top: y(node), width: NODE_W, height: NODE_H }}
              >
                <span className="w-1 shrink-0 rounded-full bg-(--course) contrast-more:w-1.5" aria-hidden />
                <span className="block min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{node.code}</span>
                  <span className="block truncate text-footnote text-muted-foreground">{node.title}</span>
                </span>
                <StatusIcon status={node.status} className="mt-0.5 size-3.5 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div aria-live="polite" className="rounded-2xl bg-fill-tertiary p-4 text-sm">
        {selected && byId.get(selected) ? (
          <Details node={byId.get(selected) as GraphNode} graph={graph} byId={byId} />
        ) : problems.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {problems.map((edge) => (
              <li key={edge.id} className="flex gap-2 text-destructive">
                <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                {byId.get(edge.from)?.code} should come before {byId.get(edge.to)?.code} ({KIND_LABEL[edge.kind]}).
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">No arrow is out of order. Select a course to see what it needs and unlocks.</p>
        )}
      </div>
    </div>
  );
}

/**
 * Drag-to-pan for a sideways scroll box, mouse only (touch and trackpads already scroll it
 * natively, with their own momentum). The content follows the pointer 1:1 from where it was
 * grabbed; on release it carries on at the pointer's speed and decelerates to the projected point,
 * as a native flick does. Grabbing again stops it at once. Reduced motion stops on release.
 *
 * Dragged past either end, the content follows with growing resistance (`rubberband`) and springs
 * back on release, rather than stopping dead. `content` is the element that moves for that.
 */
function usePan(scroller: React.RefObject<HTMLDivElement | null>, content: React.RefObject<HTMLDivElement | null>) {
  const reduceMotion = useReducedMotion();
  const drag = useRef<{ startX: number; startScroll: number; samples: { x: number; t: number }[] } | null>(null);
  const frame = useRef<number | null>(null);

  const stop = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  };
  useEffect(() => stop, []);
  // Springs a rubber-banded edge back into place.
  const settle = () => {
    const moved = content.current;
    if (!moved || !moved.style.translate || moved.style.translate.startsWith("0px")) return;
    moved.style.transition = "translate 450ms var(--ease-spring)";
    moved.style.translate = "0px 0";
  };

  return {
    onPointerDown(event: PointerEvent<HTMLDivElement>) {
      const element = scroller.current;
      // Only the background pans; courses and controls keep their clicks.
      if (!element || event.pointerType !== "mouse" || event.button !== 0 || (event.target as Element).closest("button")) return;
      stop();
      if (content.current) content.current.style.transition = "none";
      element.setPointerCapture(event.pointerId);
      drag.current = { startX: event.clientX, startScroll: element.scrollLeft, samples: [{ x: event.clientX, t: event.timeStamp }] };
    },
    onPointerMove(event: PointerEvent<HTMLDivElement>) {
      const element = scroller.current;
      const current = drag.current;
      if (!element || !current) return;
      const wanted = current.startScroll - (event.clientX - current.startX);
      const max = element.scrollWidth - element.clientWidth;
      element.scrollLeft = Math.min(Math.max(wanted, 0), max);
      // Past an end, the content itself moves, a little and then less.
      const overshoot = wanted < 0 ? wanted : wanted > max ? wanted - max : 0;
      if (content.current) content.current.style.translate = `${-rubberband(overshoot, element.clientWidth)}px 0`;
      // The last 100ms of movement, for the release velocity.
      current.samples = [...current.samples, { x: event.clientX, t: event.timeStamp }].filter((sample) => event.timeStamp - sample.t < 100);
    },
    onPointerUp(event: PointerEvent<HTMLDivElement>) {
      const element = scroller.current;
      const current = drag.current;
      drag.current = null;
      settle();
      if (!element || !current || reduceMotion) return;
      const first = current.samples[0];
      const elapsed = first ? event.timeStamp - first.t : 0;
      if (!first || elapsed <= 0) return;
      // Content moves against the pointer, so the scroll velocity is the pointer's, reversed.
      const velocity = (-(event.clientX - first.x) / elapsed) * 1000;
      const start = element.scrollLeft;
      const distance = project(velocity);
      if (Math.abs(distance) < 2) return;
      // Exponential decay: the remaining distance shrinks by DECELERATION each millisecond, which
      // starts at the release velocity and lands on the projected point.
      const began = performance.now();
      const step = (now: number) => {
        const progress = 1 - DECELERATION ** (now - began);
        element.scrollLeft = start + distance * progress;
        frame.current = progress < 0.995 && element.scrollLeft > 0 && element.scrollLeft < element.scrollWidth - element.clientWidth ? requestAnimationFrame(step) : null;
      };
      frame.current = requestAnimationFrame(step);
    },
    onPointerCancel() {
      drag.current = null;
      settle();
    },
  };
}

function Details({ node, graph, byId }: { node: GraphNode; graph: PrereqGraph; byId: Map<string, GraphNode> }) {
  const describe = (edge: GraphEdge, other: string) => {
    const course = byId.get(other);
    const term = graph.columns[course?.column ?? -1]?.name;
    return `${course?.code ?? "?"}${term ? ` (${term})` : ""}, ${KIND_LABEL[edge.kind]}${edge.alternative ? ", one of several" : ""}`;
  };
  const needs = graph.edges.filter((edge) => edge.to === node.id);
  const unlocks = graph.edges.filter((edge) => edge.from === node.id);
  const unmet = graph.unmet.get(node.id) ?? [];

  return (
    <div className="flex flex-col gap-3">
      <p className="text-headline">
        {node.code} <span className="font-normal text-muted-foreground">{node.title}</span>
      </p>
      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        <div>
          <dt className="font-medium">Needs</dt>
          <dd className="text-muted-foreground">
            {needs.length === 0 && unmet.length === 0 ? (
              "Nothing in the plan."
            ) : (
              <ul>
                {needs.map((edge) => (
                  <li key={edge.id} className={cn(edge.problem && "text-destructive")}>
                    {describe(edge, edge.from)}
                    {edge.problem && ": too late"}
                  </li>
                ))}
                {unmet.map((group) => (
                  <li key={group}>{group}, not in the plan</li>
                ))}
              </ul>
            )}
          </dd>
        </div>
        <div>
          <dt className="font-medium">Unlocks</dt>
          <dd className="text-muted-foreground">
            {unlocks.length === 0 ? (
              "Nothing in the plan."
            ) : (
              <ul>
                {unlocks.map((edge) => (
                  <li key={edge.id}>{describe(edge, edge.to)}</li>
                ))}
              </ul>
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function Legend() {
  const items = [
    { kind: "prereq", label: "Prerequisite" },
    { kind: "coreq", label: "Corequisite" },
    { kind: "recommended", label: "Recommended" },
  ] as const;
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      {items.map(({ kind, label }) => (
        <li key={kind} className="flex items-center gap-1.5">
          <svg aria-hidden width="24" height="6" className="overflow-visible">
            <line x1="0" y1="3" x2="24" y2="3" strokeDasharray={KIND_DASH[kind]} strokeLinecap="round" className="stroke-tertiary-foreground [stroke-width:1.5]" />
          </svg>
          {label}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <svg aria-hidden width="24" height="6">
          <line x1="0" y1="3" x2="24" y2="3" className="stroke-destructive [stroke-width:1.5]" />
        </svg>
        Out of order
      </li>
    </ul>
  );
}
