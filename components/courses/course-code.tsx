import { cn } from "@/lib/utils";

// A course code as a small badge, for telling this term's courses apart at a glance. Colour stays
// with the course's type (see the 2026-10-29 course colour decision), so the badge is neutral and
// the monospaced code does the work.
export function CourseCode({ code, className }: { code: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-md bg-fill-secondary px-1.5 py-0.5 font-mono text-xs font-semibold whitespace-nowrap", className)}>
      {code}
    </span>
  );
}
