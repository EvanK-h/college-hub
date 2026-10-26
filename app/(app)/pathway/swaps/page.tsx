import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PAGE_CLASS, PageHeader } from "@/components/page-header";
import { QUANTUM_RELEVANCE_LABELS, SWAP_SLOT_LABELS } from "@/lib/pathway/labels";
import { buildSwapGroups, type SwapWithReplaces } from "@/lib/pathway/swaps";
import { createClient } from "@/lib/supabase/server";

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

  const [swapsResult, linksResult, coursesResult] = await Promise.all([
    // Enums sort by declaration order (worst to best), so descending puts the best fit first.
    supabase
      .from("swap_options")
      .select("id, swap_in, slot, fits_in, prerequisites, quantum_relevance, why_consider, why_current_better")
      .order("quantum_relevance", { ascending: false })
      .order("swap_in"),
    supabase.from("swap_replaces").select("swap_option_id, course_id"),
    supabase.from("courses").select("id, code, title"),
  ]);
  if (swapsResult.error) throw new Error(`Loading swaps failed: ${swapsResult.error.message}`);
  if (linksResult.error) throw new Error(`Loading swap links failed: ${linksResult.error.message}`);
  if (coursesResult.error) throw new Error(`Loading courses failed: ${coursesResult.error.message}`);

  const groups = buildSwapGroups(swapsResult.data, linksResult.data, coursesResult.data);

  return (
    <>
      {groups.map(({ slot, swaps }) => (
        <section key={slot} aria-labelledby={`slot-${slot}`} className="flex flex-col gap-3">
          <h2 id={`slot-${slot}`} className="px-1 text-title-3">
            {SWAP_SLOT_LABELS[slot]}
          </h2>
          <ul className="flex flex-col gap-3">
            {swaps.map((swap) => (
              <li key={swap.id}>
                <SwapCard swap={swap} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

function SwapCard({ swap }: { swap: SwapWithReplaces }) {
  return (
    <article className="rounded-2xl bg-card p-5 text-card-foreground shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <h3 className="text-headline">{swap.swap_in}</h3>
        <p className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
          <span className="sr-only">Quantum relevance: </span>
          {QUANTUM_RELEVANCE_LABELS[swap.quantum_relevance]}
        </p>
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
    <div className="rounded-xl bg-foreground/4 p-3.5">
      <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{heading}</h4>
      <p className="mt-1.5 leading-relaxed">{text ?? "—"}</p>
    </div>
  );
}
