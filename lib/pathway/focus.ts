// The Quantum / AI focus: which direction the swap options are ranked for. Kept in a cookie so
// it survives visits; see the 2026-10-27 decision.
import type { Relevance } from "./labels";

export const FOCUSES = ["quantum", "ai"] as const;
export type Focus = (typeof FOCUSES)[number];

export const FOCUS_COOKIE = "pathway-focus";
export const FOCUS_LABELS: Record<Focus, string> = { quantum: "Quantum", ai: "AI" };

/** Anything unknown (no cookie yet, an old value) falls back to quantum, the plan's main direction. */
export function parseFocus(value: string | undefined): Focus {
  return FOCUSES.find((focus) => focus === value) ?? "quantum";
}

const RANK: Record<Relevance, number> = { none: 0, lower: 1, low: 2, medium: 3, high: 4 };

type Rated = { quantum_relevance: Relevance; ai_relevance: Relevance };

/** Best fit for the focus first; ties go to the other direction's relevance. Stable otherwise. */
export function sortByFocus<T extends Rated>(swaps: readonly T[], focus: Focus): T[] {
  const [first, second] = focus === "quantum" ? (["quantum_relevance", "ai_relevance"] as const) : (["ai_relevance", "quantum_relevance"] as const);
  return [...swaps].sort((a, b) => RANK[b[first]] - RANK[a[first]] || RANK[b[second]] - RANK[a[second]]);
}

/** The relevance a swap has for a focus. */
export function relevanceFor(swap: Rated, focus: Focus): Relevance {
  return focus === "quantum" ? swap.quantum_relevance : swap.ai_relevance;
}
