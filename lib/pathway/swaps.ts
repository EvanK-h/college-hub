import type { Database } from "@/lib/database.types";
import type { SwapSlot } from "@/lib/pathway/labels";

type SwapRow = Database["public"]["Tables"]["swap_options"]["Row"];

export type Swap = Pick<
  SwapRow,
  "id" | "swap_in" | "slot" | "fits_in" | "prerequisites" | "quantum_relevance" | "why_consider" | "why_current_better"
>;
export type SwapLink = { swap_option_id: string; course_id: string };
export type SwapCourse = { id: string; code: string; title: string };

export type SwapWithReplaces = Swap & { replaces: SwapCourse[] };
export type SwapGroup = { slot: SwapSlot; swaps: SwapWithReplaces[] };

const SLOT_ORDER: SwapSlot[] = [
  "london_elective",
  "khoury_elective",
  "ai_elective",
  "software_engineering",
  "placement_substitute",
  "physics_minor_elective",
  "advanced_writing",
];

// Attaches the courses each swap would replace, then groups swaps by slot in a fixed order.
// Order within a slot is the input order, so the query decides the relevance sort.
// A link to an unknown course is skipped rather than failing the whole page.
export function buildSwapGroups(swaps: Swap[], links: SwapLink[], courses: SwapCourse[]): SwapGroup[] {
  const courseById = new Map(courses.map((course) => [course.id, course]));
  const linksBySwap = Map.groupBy(links, (link) => link.swap_option_id);

  const withReplaces: SwapWithReplaces[] = swaps.map((swap) => ({
    ...swap,
    replaces: (linksBySwap.get(swap.id) ?? []).flatMap((link) => courseById.get(link.course_id) ?? []),
  }));

  return SLOT_ORDER.map((slot) => ({ slot, swaps: withReplaces.filter((swap) => swap.slot === slot) })).filter(
    (group) => group.swaps.length > 0,
  );
}
