import { Suspense } from "react";
import { redirect } from "next/navigation";
import { QUANTUM_RELEVANCE_LABELS, SWAP_SLOT_LABELS } from "@/lib/pathway/labels";
import { buildSwapGroups, type SwapWithReplaces } from "@/lib/pathway/swaps";
import { createClient } from "@/lib/supabase/server";

export default function SwapsPage() {
  return (
    <main className="flex flex-1 flex-col gap-6 p-4">
      <h1 className="text-2xl font-semibold tracking-tight">Swap options</h1>
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
          <h2 id={`slot-${slot}`} className="text-lg font-semibold">
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
    <article className="rounded-md border bg-card p-4 text-card-foreground">
      <h3 className="font-medium">{swap.swap_in}</h3>
      <dl className="mt-1 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
        <Detail label="Quantum relevance" value={QUANTUM_RELEVANCE_LABELS[swap.quantum_relevance]} />
        <Detail label="Fits in" value={swap.fits_in} />
        <Detail label="Prerequisites" value={swap.prerequisites} />
        <Detail label="Replaces" value={swap.replaces.map((course) => `${course.code} · ${course.title}`).join(", ")} />
      </dl>
      <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
        <Reason heading="Why consider it" text={swap.why_consider} />
        <Reason heading="Why the current pick is better" text={swap.why_current_better} />
      </div>
    </article>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-1">
      <dt className="font-medium">{label}:</dt>
      <dd>{value}</dd>
    </div>
  );
}

function Reason({ heading, text }: { heading: string; text: string | null }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{heading}</h4>
      <p className="mt-1">{text ?? "—"}</p>
    </div>
  );
}
