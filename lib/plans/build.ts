// What a what-if plan looks like once its rows are laid over the real plan. Pure functions, so
// the rules (see the create_plans migration) are tested in one place:
// - done and in-progress courses always stay in their real term;
// - a planned course sits where the plan puts it, or in its real term if the plan has no row;
// - a swap takes the place of the course it replaces, with that course's credits and type.
import type { PathwayCourse } from "@/lib/pathway/summarize";

export type RealCourse = PathwayCourse & { termId: number };
export type PlanRow = { termId: number; courseId: string | null; swapOptionId: string | null; replacesCourseId: string | null };
export type SwapChoice = { id: string; swapIn: string };

export type PlanItem = PathwayCourse & {
  termId: number;
  /** For a swap: the course it takes the place of. */
  replaces?: { id: string; code: string };
};

/** Board ids: a course's own id, or "swap:<swap option id>" for a swap taken in. */
export const swapItemId = (swapOptionId: string) => `swap:${swapOptionId}`;

/** "CY 4770 · Foundations of Cryptography" → its code and title; null for anything else. */
export function parseSwapCourse(swapIn: string): { code: string; title: string } | null {
  const match = /^([A-Z]{2,4} \d{4}) · (.+)$/.exec(swapIn.trim());
  return match?.[1] && match[2] ? { code: match[1], title: match[2] } : null;
}

export function buildPlan(courses: readonly RealCourse[], rows: readonly PlanRow[], swaps: readonly SwapChoice[]): PlanItem[] {
  const placed = new Map(rows.flatMap((row) => (row.courseId ? [[row.courseId, row.termId] as const] : [])));
  const replacedBy = new Map(rows.flatMap((row) => (row.replacesCourseId ? [[row.replacesCourseId, row] as const] : [])));
  const swapById = new Map(swaps.map((swap) => [swap.id, swap]));

  const items: PlanItem[] = [];
  for (const course of courses) {
    const planned = course.status === "planned";
    const swapRow = planned ? replacedBy.get(course.id) : undefined;
    const swap = swapRow?.swapOptionId ? swapById.get(swapRow.swapOptionId) : undefined;
    const swapCourse = swap ? parseSwapCourse(swap.swapIn) : null;
    if (swapRow && swap && swapCourse) {
      items.push({
        id: swapItemId(swap.id),
        code: swapCourse.code,
        title: swapCourse.title,
        credits: course.credits,
        type: course.type,
        status: "planned",
        termId: swapRow.termId,
        replaces: { id: course.id, code: course.code },
      });
      continue;
    }
    items.push({ ...course, termId: planned ? (placed.get(course.id) ?? course.termId) : course.termId });
  }
  return items;
}

export type ItemChange =
  | { kind: "same" }
  | { kind: "moved"; fromTermId: number }
  | { kind: "only_here" };

/**
 * How each item of plan `a` differs from plan `b`: in the same term, moved from another term, or
 * not in `b` at all (a swap, or a course `b` swapped out). Keyed by item id.
 */
export function comparePlans(a: readonly PlanItem[], b: readonly PlanItem[]): Map<string, ItemChange> {
  const termInB = new Map(b.map((item) => [item.id, item.termId]));
  return new Map(
    a.map((item) => {
      const other = termInB.get(item.id);
      const change: ItemChange =
        other === undefined ? { kind: "only_here" } : other === item.termId ? { kind: "same" } : { kind: "moved", fromTermId: other };
      return [item.id, change];
    }),
  );
}

/** How many courses a plan places differently from the real plan: moves plus swaps. */
export function countChanges(plan: readonly PlanItem[], real: readonly PlanItem[]): number {
  return [...comparePlans(plan, real).values()].filter((change) => change.kind !== "same").length;
}
