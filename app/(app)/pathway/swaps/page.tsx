import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ChevronRight, FlaskConical } from "lucide-react";
import { trySwap } from "@/app/(app)/pathway/plans/actions";
import { PAGE_CLASS, PageHeader } from "@/components/page-header";
import { PlanNav } from "@/components/pathway/plan-nav";
import { FocusToggle } from "@/components/pathway/focus-toggle";
import { RelevanceMeter } from "@/components/pathway/relevance-meter";
import { CardListSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { FOCUS_COOKIE, parseFocus, relevanceFor, sortByFocus, type Rated } from "@/lib/pathway/focus";
import { RELEVANCE_LABELS, type Relevance } from "@/lib/pathway/labels";
import { parseSwapCourse } from "@/lib/plans/build";
import { buildSwapGroups, type Swap, type SwapWithReplaces } from "@/lib/pathway/swaps";
import { loadSetup } from "@/lib/setup/load";
import type { FocusInfo } from "@/lib/setup/setup";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

// Relevance is ranked, so the pill's strength follows the rank: the best fits stand out and the
// weakest recede to an outline. A four-dot meter tells neighbouring ranks apart, and the label
// carries the same information for anyone not seeing colour.
const RELEVANCE_PILL: Record<Relevance, string> = {
  high: "bg-accent font-semibold text-accent-foreground ring-1 ring-accent-foreground/30 ring-inset",
  medium: "bg-accent font-medium text-accent-foreground",
  low: "bg-fill-secondary font-medium text-muted-foreground",
  lower: "bg-fill-secondary font-medium text-muted-foreground",
  none: "font-medium text-tertiary-foreground ring-1 ring-border ring-inset",
};

export default function SwapsPage() {
  return (
    <main className={PAGE_CLASS}>
      <PageHeader title="Swap options" nav={<PlanNav />} />
      <Suspense fallback={<CardListSkeleton />}>
        <Swaps />
      </Suspense>
    </main>
  );
}

async function Swaps() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  // The proxy already redirects signed-out visitors; this is a second check in case it is ever bypassed.
  if (!claims?.claims) redirect("/login");

  const [swapsResult, linksResult, coursesResult, ratingsResult, setup, store] = await Promise.all([
    // Sorted by name here so ties stay put; sortByFocus then ranks by the chosen relevance.
    supabase.from("swap_options").select("id, swap_in, slot_id, fits_in, prerequisites, why_consider, why_current_better").order("swap_in"),
    supabase.from("swap_replaces").select("swap_option_id, course_id"),
    supabase.from("courses").select("id, code, title, status"),
    supabase.from("swap_relevance").select("swap_option_id, focus_id, relevance"),
    loadSetup(),
    cookies(),
  ]);
  if (swapsResult.error) throw new Error(`Loading swaps failed: ${swapsResult.error.message}`);
  if (linksResult.error) throw new Error(`Loading swap links failed: ${linksResult.error.message}`);
  if (coursesResult.error) throw new Error(`Loading courses failed: ${coursesResult.error.message}`);
  if (ratingsResult.error) throw new Error(`Loading swap ratings failed: ${ratingsResult.error.message}`);

  const focusIds = setup.focuses.map((focus) => focus.id);
  const focus = parseFocus(store.get(FOCUS_COOKIE)?.value, focusIds);
  const ratings = Map.groupBy(ratingsResult.data, (rating) => rating.swap_option_id);
  const rated = swapsResult.data.map((swap) => ({
    ...swap,
    relevance: Object.fromEntries((ratings.get(swap.id) ?? []).map((rating) => [rating.focus_id, rating.relevance])),
  }));
  const groups = buildSwapGroups(setup.slots, focus ? sortByFocus(rated, focus, focusIds) : rated, linksResult.data, coursesResult.data);

  // A swap can go into a what-if plan in place of a course that's still planned.
  const planned = new Set(coursesResult.data.filter((course) => course.status === "planned").map((course) => course.id));

  if (groups.length === 0) return <p className="text-muted-foreground">No swap options yet. Add them to your data folder and import it.</p>;

  return (
    <>
      {focus && setup.focuses.length > 1 && <FocusToggle focuses={setup.focuses} focus={focus} />}
      {groups.map(({ slot, swaps }) => (
        <section key={slot.id} aria-labelledby={`slot-${slot.id}`} className="flex flex-col gap-3">
          <h2 id={`slot-${slot.id}`} className="px-1 text-title-3">
            {slot.name}
          </h2>
          <ul className="flex flex-col gap-2">
            {swaps.map((swap) => (
              <li key={swap.id}>
                <SwapRow swap={swap} focuses={setup.focuses} focus={focus} planned={planned} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

// A row you can scan ("PHIL 1115 · Ethics, for ECON 2350 · Spring 2027 · AI: High") that opens to the
// reasons, so a handful of options compare on one screen.
function SwapRow({
  swap,
  focuses,
  focus,
  planned,
}: {
  swap: SwapWithReplaces<Swap & Rated>;
  focuses: FocusInfo[];
  focus: string | null;
  planned: ReadonlySet<string>;
}) {
  const chosen = focuses.find((option) => option.id === focus);
  const others = focuses.filter((option) => option.id !== focus);
  const course = parseSwapCourse(swap.swap_in);
  // Only a single named course can stand in for one in a plan.
  const tryable = course ? swap.replaces.filter((replaced) => planned.has(replaced.id)) : [];

  return (
    <details className="group rounded-2xl bg-card text-card-foreground shadow-card">
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-2xl px-4 py-3 focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
        <ChevronRight aria-hidden className="size-4 shrink-0 text-tertiary-foreground transition-transform group-open:rotate-90" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm">
            {course ? (
              <>
                <span className="font-semibold">{course.code}</span> <span className="text-muted-foreground">{course.title}</span>
              </>
            ) : (
              <span className="font-semibold">{swap.swap_in}</span>
            )}
          </span>
          <span className="mt-0.5 block truncate text-footnote text-muted-foreground">
            {[swap.replaces.length > 0 && `For ${swap.replaces.map((replaced) => replaced.code).join(", ")}`, swap.fits_in].filter(Boolean).join(" · ")}
          </span>
        </span>
        {/* The chosen focus's relevance is the pill; the others sit beside it as plain text. */}
        <span className="flex shrink-0 items-center gap-2 text-xs">
          {others.map((option) => (
            <span key={option.id} className="hidden items-center gap-1.5 text-muted-foreground sm:inline-flex">
              <RelevanceMeter relevance={relevanceFor(swap, option.id)} />
              {option.name}: {RELEVANCE_LABELS[relevanceFor(swap, option.id)]}
            </span>
          ))}
          {chosen && (
            <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5", RELEVANCE_PILL[relevanceFor(swap, chosen.id)])}>
              <RelevanceMeter relevance={relevanceFor(swap, chosen.id)} />
              {chosen.name}: {RELEVANCE_LABELS[relevanceFor(swap, chosen.id)]}
            </span>
          )}
        </span>
      </summary>

      <div className="flex flex-col gap-4 px-4 pb-4">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-footnote">
          <Detail label="Fits in" value={swap.fits_in} />
          <Detail label="Prerequisites" value={swap.prerequisites} />
          <Detail label="Replaces" value={swap.replaces.map((replaced) => `${replaced.code} · ${replaced.title}`).join(", ")} />
          {others.map((option) => (
            <Detail key={option.id} label={option.name} value={RELEVANCE_LABELS[relevanceFor(swap, option.id)]} className="sm:hidden" />
          ))}
        </dl>
        <div className="grid gap-2.5 text-sm md:grid-cols-2">
          <Reason heading="Why consider it" text={swap.why_consider} />
          <Reason heading="Why the current pick is better" text={swap.why_current_better} />
        </div>
        {tryable.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tryable.map((replaced) => (
              <form key={replaced.id} action={trySwap}>
                <input type="hidden" name="choice" value={`${swap.id}:${replaced.id}`} />
                <Button type="submit" variant="outline" size="sm">
                  <FlaskConical aria-hidden />
                  Try in a what-if plan{tryable.length > 1 && ` for ${replaced.code}`}
                </Button>
              </form>
            ))}
          </div>
        )}
      </div>
    </details>
  );
}

function Detail({ label, value, className }: { label: string; value: string | null; className?: string }) {
  if (!value) return null;
  return (
    <>
      <dt className={cn("text-muted-foreground", className)}>{label}</dt>
      <dd className={className}>{value}</dd>
    </>
  );
}

function Reason({ heading, text }: { heading: string; text: string | null }) {
  return (
    <div className="rounded-xl bg-fill-tertiary p-3.5">
      <h4 className="text-footnote font-semibold text-muted-foreground">{heading}</h4>
      <p className="mt-1.5 leading-relaxed">{text ?? "—"}</p>
    </div>
  );
}
