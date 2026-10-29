import { Suspense } from "react";
import { SegmentedLinks, SegmentedNav } from "@/components/segmented-nav";

// The Plan section's own pages, one level under the main nav's "Plan". The prerequisite graph is
// a view of Pathway, not a page of its own.
const PLAN_PAGES = [
  { href: "/pathway", label: "Pathway" },
  { href: "/pathway/requirements", label: "Requirements" },
  { href: "/pathway/swaps", label: "Swaps" },
  { href: "/pathway/plans", label: "What-if" },
] as const;

// The current page comes from the URL, so it waits for the request; meanwhile the same control
// shows with nothing selected, so the page doesn't shift when it appears.
export function PlanNav() {
  return (
    <Suspense fallback={<SegmentedLinks links={PLAN_PAGES} label="Plan" layoutId="plan-nav-pill" current={null} />}>
      <SegmentedNav links={PLAN_PAGES} label="Plan" layoutId="plan-nav-pill" />
    </Suspense>
  );
}
