import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PAGE_CLASS, PageHeader } from "@/components/page-header";
import { FocusToggle } from "@/components/pathway/focus-toggle";
import { FOCUS_COOKIE, parseFocus, relevanceFor, sortByFocus, type Rated } from "@/lib/pathway/focus";
import { RELEVANCE_LABELS, type Relevance } from "@/lib/pathway/labels";
import { buildSwapGroups, type Swap, type SwapWithReplaces } from "@/lib/pathway/swaps";
import { loadSetup } from "@/lib/setup/load";
import type { FocusInfo } from "@/lib/setup/setup";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

// Relevance is ranked, so the pill's strength follows the rank: the best fits stand out and the
// weakest recede to an outline. The label carries the same information for anyone not seeing colour.
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
      <PageHeader eyebrow="Degree plan" title="Swap options" />
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
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
    supabase.from("courses").select("id, code, title"),
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

  if (groups.length === 0) return <p className="text-muted-foreground">No swap options yet. Add them to your data folder and import it.</p>;

  return (
    <>
      {focus && setup.focuses.length > 1 && <FocusToggle focuses={setup.focuses} focus={focus} />}
      {groups.map(({ slot, swaps }) => (
        <section key={slot.id} aria-labelledby={`slot-${slot.id}`} className="flex flex-col gap-3">
          <h2 id={`slot-${slot.id}`} className="px-1 text-title-3">
            {slot.name}
          </h2>
          <ul className="flex flex-col gap-3">
            {swaps.map((swap) => (
              <li key={swap.id}>
                <SwapCard swap={swap} focuses={setup.focuses} focus={focus} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

function SwapCard({ swap, focuses, focus }: { swap: SwapWithReplaces<Swap & Rated>; focuses: FocusInfo[]; focus: string | null }) {
  const chosen = focuses.find((option) => option.id === focus);
  const others = focuses.filter((option) => option.id !== focus);
  return (
    <article className="rounded-2xl bg-card p-5 text-card-foreground shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <h3 className="text-headline">{swap.swap_in}</h3>
        {/* The chosen focus's relevance is the pill; the others sit beside it as plain text. */}
        <div className="flex items-center gap-2 text-xs">
          {others.map((option) => (
            <span key={option.id} className="text-muted-foreground">
              {option.name}: {RELEVANCE_LABELS[relevanceFor(swap, option.id)]}
            </span>
          ))}
          {chosen && (
            <p className={cn("rounded-full px-2.5 py-0.5", RELEVANCE_PILL[relevanceFor(swap, chosen.id)])}>
              {chosen.name}: {RELEVANCE_LABELS[relevanceFor(swap, chosen.id)]}
            </p>
          )}
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
        <Detail label="Fits in" value={swap.fits_in} />
        <Detail label="Prerequisites" value={swap.prerequisites} />
        <Detail label="Replaces" value={swap.replaces.map((course) => `${course.code} · ${course.title}`).join(", ")} />
      </dl>
      <div className="mt-4 grid gap-2.5 text-sm md:grid-cols-2">
        <Reason heading="Why consider it" text={swap.why_consider} />
        <Reason heading="Why the current pick is better" text={swap.why_current_better} />
      </div>
    </article>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </>
  );
}

function Reason({ heading, text }: { heading: string; text: string | null }) {
  return (
    <div className="rounded-xl bg-fill-tertiary p-3.5">
      <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{heading}</h4>
      <p className="mt-1.5 leading-relaxed">{text ?? "—"}</p>
    </div>
  );
}
