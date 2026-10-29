import { Suspense } from "react";
import { SegmentedNav } from "@/components/segmented-nav";

// The Plan section's own pages, one level under the main nav's "Plan".
const PLAN_PAGES = [
  { href: "/pathway", label: "Pathway" },
  { href: "/pathway/requirements", label: "Requirements" },
  { href: "/pathway/swaps", label: "Swaps" },
  { href: "/pathway/graph", label: "Prerequisites" },
  { href: "/pathway/plans", label: "What-if" },
] as const;

// The current page comes from the URL, so it waits for the request; the placeholder holds the
// control's height so the page doesn't shift when it appears.
export function PlanNav() {
  return (
    <Suspense fallback={<div className="h-10" />}>
      <SegmentedNav links={PLAN_PAGES} label="Plan" layoutId="plan-nav-pill" />
    </Suspense>
  );
}
