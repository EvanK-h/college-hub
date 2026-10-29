import { RELEVANCE_STEPS, type Relevance } from "@/lib/pathway/labels";
import { cn } from "@/lib/utils";

// Four dots, filled up to the rank (●●○○), so neighbouring ranks such as Low and Lower read apart
// at a glance. The word beside it carries the same thing, so the meter is hidden from screen readers.
export function RelevanceMeter({ relevance, className }: { relevance: Relevance; className?: string }) {
  return (
    <span aria-hidden className={cn("inline-flex items-center gap-0.5 align-middle", className)}>
      {[1, 2, 3, 4].map((step) => (
        <span key={step} className={cn("size-1.5 rounded-full", step <= RELEVANCE_STEPS[relevance] ? "bg-current" : "bg-current opacity-25")} />
      ))}
    </span>
  );
}
