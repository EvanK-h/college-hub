// Focuses are the directions a student might take (say Quantum and AI). Each swap option has a
// relevance per focus, and the swaps page ranks by the chosen one. The choice is a preference, so
// it lives in a cookie; see the 2026-10-27 and 2026-10-29 decisions.
import type { Relevance } from "./labels";

export const FOCUS_COOKIE = "pathway-focus";

/** The focus id from the cookie, or the first focus when it's missing or no longer exists. */
export function parseFocus(value: string | undefined, focusIds: readonly string[]): string | null {
  return focusIds.find((id) => id === value) ?? focusIds[0] ?? null;
}

const RANK: Record<Relevance, number> = { none: 0, lower: 1, low: 2, medium: 3, high: 4 };

/** A swap's relevance for each focus id; a missing rating counts as none. */
export type Rated = { relevance: Partial<Record<string, Relevance>> };

export function relevanceFor(swap: Rated, focusId: string): Relevance {
  return swap.relevance[focusId] ?? "none";
}

/**
 * Best fit for the chosen focus first; ties go to the other focuses in order. Stable otherwise.
 * `focusIds` lists every focus in display order.
 */
export function sortByFocus<T extends Rated>(swaps: readonly T[], focusId: string, focusIds: readonly string[]): T[] {
  const order = [focusId, ...focusIds.filter((id) => id !== focusId)];
  return [...swaps].sort((a, b) => {
    for (const id of order) {
      const difference = RANK[relevanceFor(b, id)] - RANK[relevanceFor(a, id)];
      if (difference !== 0) return difference;
    }
    return 0;
  });
}
