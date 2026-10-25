import type { ReqArea } from "@/lib/pathway/labels";

// What every progress ring draws: how many items are done, in progress, or neither.
export type RingCounts = { done: number; inProgress: number; notStarted: number; total: number };
export type AreaSummary = RingCounts & { area: ReqArea };

// The areas the spec names first get the top of the page; the rest follow in a fixed order.
export const HEADLINE_AREAS: ReqArea[] = ["cs_required", "ai_concentration", "physics_minor"];
const AREA_ORDER: ReqArea[] = [
  ...HEADLINE_AREAS,
  "cs_overview",
  "cs_fundamentals",
  "security_presentation",
  "khoury_electives",
  "supporting",
  "writing",
  "universitywide",
];

// `status` comes from the requirement_progress view, where every column is typed nullable.
export type AreaRequirement = { area: ReqArea; status: string | null };

// Counts requirements per area by status. Areas with no requirements are left out.
export function summarizeAreas(requirements: AreaRequirement[]): AreaSummary[] {
  return AREA_ORDER.map((area) => {
    const inArea = requirements.filter((requirement) => requirement.area === area);
    const done = inArea.filter((requirement) => requirement.status === "done").length;
    const inProgress = inArea.filter((requirement) => requirement.status === "in_progress").length;
    return { area, done, inProgress, notStarted: inArea.length - done - inProgress, total: inArea.length };
  }).filter((summary) => summary.total > 0);
}
