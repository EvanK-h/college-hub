import type { Database } from "@/lib/database.types";
import type { SlotInfo } from "@/lib/setup/setup";

type SwapRow = Database["public"]["Tables"]["swap_options"]["Row"];

export type Swap = Pick<SwapRow, "id" | "swap_in" | "slot_id" | "fits_in" | "prerequisites" | "why_consider" | "why_current_better">;
export type SwapLink = { swap_option_id: string; course_id: string };
export type SwapCourse = { id: string; code: string; title: string };

export type SwapWithReplaces<T extends Swap = Swap> = T & { replaces: SwapCourse[] };
export type SwapGroup<T extends Swap = Swap> = { slot: SlotInfo; swaps: SwapWithReplaces<T>[] };

// Attaches the courses each swap would replace, then groups swaps by slot in the slots' order.
// Order within a slot is the input order, so the caller decides the relevance sort.
// A link to an unknown course is skipped rather than failing the whole page.
export function buildSwapGroups<T extends Swap>(slots: SlotInfo[], swaps: T[], links: SwapLink[], courses: SwapCourse[]): SwapGroup<T>[] {
  const courseById = new Map(courses.map((course) => [course.id, course]));
  const linksBySwap = Map.groupBy(links, (link) => link.swap_option_id);

  const withReplaces: SwapWithReplaces<T>[] = swaps.map((swap) => ({
    ...swap,
    replaces: (linksBySwap.get(swap.id) ?? []).flatMap((link) => courseById.get(link.course_id) ?? []),
  }));

  return slots
    .map((slot) => ({ slot, swaps: withReplaces.filter((swap) => swap.slot_id === slot.id) }))
    .filter((group) => group.swaps.length > 0);
}
