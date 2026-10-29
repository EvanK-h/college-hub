import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CircleAlert } from "lucide-react";
import { PAGE_CLASS, PageHeader } from "@/components/page-header";
import { CompareSkeleton } from "@/components/skeletons";
import { buttonVariants } from "@/components/ui/button";
import { describeProblem, planProblems, type CreditLimits, type PlanProblem } from "@/lib/pathway/move-checks";
import { buildPlan, comparePlans, type ItemChange, type PlanItem } from "@/lib/plans/build";
import { parsePlanRef } from "@/lib/plans/forms";
import { loadPlanning, loadPlanRows, type Planning } from "@/lib/plans/load";
import { loadSetup } from "@/lib/setup/load";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

// Two plans side by side, term by term. The plans come from the query string (?a=&b=, each a
// plan id or "current"), so a comparison has its own URL.
export default function ComparePage({ searchParams }: PageProps<"/pathway/plans/compare">) {
  return (
    <main className={PAGE_CLASS}>
      <Suspense fallback={<CompareSkeleton />}>
        {searchParams.then((params) => (
          <Compare a={parsePlanRef(params.a)} b={parsePlanRef(params.b)} all={params.all === "1"} />
        ))}
      </Suspense>
    </main>
  );
}

type Side = { id: string | null; name: string; items: PlanItem[]; problems: PlanProblem[]; changes: Map<string, ItemChange> };

async function Compare({ a, b, all }: { a: string | null; b: string | null; all: boolean }) {
  if (!a || !b) notFound();
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  // The proxy already redirects signed-out visitors; this is a second check in case it is ever bypassed.
  if (!claims?.claims) redirect("/login");

  const [planning, setup] = await Promise.all([loadPlanning(supabase), loadSetup()]);
  const { creditLimits, creditUnit } = setup.profile;
  const [planA, planB] = await Promise.all([load(planning, a), load(planning, b)]);
  const left: Side = { ...planA, changes: comparePlans(planA.items, planB.items), problems: problemsOf(planning, planA.items, creditLimits) };
  const right: Side = { ...planB, changes: comparePlans(planB.items, planA.items), problems: problemsOf(planning, planB.items, creditLimits) };

  const differs = (termId: number) =>
    [left, right].some((side) => side.items.some((item) => item.termId === termId && side.changes.get(item.id)?.kind !== "same"));
  const terms = planning.terms.filter((term) => (all ? [left, right].some((side) => side.items.some((item) => item.termId === term.id)) : differs(term.id)));
  const termName = (termId: number) => planning.terms.find((term) => term.id === termId)?.name ?? "another term";
  const query = `a=${a}&b=${b}`;

  async function load(planning: Planning, ref: string) {
    if (ref === "current") return { id: null, name: "Current plan", items: buildPlan(planning.courses, [], planning.swaps) };
    const saved = await loadPlanRows(supabase, ref);
    if (!saved) notFound();
    return { id: ref, name: saved.plan.name, items: buildPlan(planning.courses, saved.rows, planning.swaps) };
  }

  return (
    <>
      <PageHeader back={{ href: "/pathway/plans", label: "What-if plans" }} title="Compare plans">
        <div className="mt-2 flex flex-wrap gap-2">
          {/* Back to the plans being compared (the current plan has no page of its own here). */}
          {[left, right].map((side) =>
            side.id ? (
              <Link key={side.id} href={`/pathway/plans/${side.id}`} className={buttonVariants({ variant: "outline" })}>
                Back to {side.name}
              </Link>
            ) : null,
          )}
          <Link href={`/pathway/plans/compare?${query}${all ? "" : "&all=1"}`} className={buttonVariants({ variant: "outline" })}>
            {all ? "Only terms that differ" : "Show every term"}
          </Link>
        </div>
      </PageHeader>

      {/* Summary: each plan's name, how many courses it places differently, and its problems. */}
      <div className="grid gap-3 sm:grid-cols-2">
        {[left, right].map((side, index) => (
          <section key={index} aria-label={side.name} className="flex flex-col gap-2 rounded-2xl bg-card p-4 shadow-card">
            <h2 className="text-headline">{side.name}</h2>
            <p className="text-sm text-muted-foreground">
              {[...side.changes.values()].filter((change) => change.kind !== "same").length} courses placed differently from {(index === 0 ? right : left).name}.
            </p>
            {side.problems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No problems.</p>
            ) : (
              <ul className="flex flex-col gap-1 text-sm text-destructive">
                {side.problems.map(({ termId, courseCode, problem }, i) => (
                  <li key={i} className="flex gap-1.5">
                    <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                    {courseCode ? `${courseCode}: ` : ""}
                    {describeProblem(problem, termName(termId), creditUnit)}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      {terms.length === 0 ? (
        <p className="text-muted-foreground">These plans place every course in the same term.</p>
      ) : (
        <ol className="flex flex-col gap-4">
          {terms.map((term) => (
            <li key={term.id} className="rounded-2xl bg-fill-tertiary p-3">
              <h2 className="px-1 pb-2 text-headline">{term.name}</h2>
              <div className="grid grid-cols-2 gap-3">
                {[left, right].map((side, index) => {
                  const inTerm = side.items.filter((item) => item.termId === term.id).sort((x, y) => x.code.localeCompare(y.code));
                  const total = inTerm.reduce((sum, item) => sum + Number(item.credits), 0);
                  const limit = creditLimits[term.kind];
                  const over = limit !== undefined && total > limit;
                  const other = index === 0 ? right : left;
                  return (
                    <div key={index} className="flex min-w-0 flex-col gap-1.5">
                      <p className={cn("truncate px-1 text-xs tabular-nums", over ? "font-medium text-destructive" : "text-muted-foreground")}>
                        <span className="font-medium">{side.name}</span> · {total} {creditUnit}
                        {over ? `, over the ${limit} ${creditUnit} limit` : ""}
                      </p>
                      <ul className="flex flex-col gap-1.5">
                        {inTerm.map((item) => {
                          const change = side.changes.get(item.id);
                          const note =
                            change?.kind === "moved"
                              ? `Moved from ${termName(change.fromTermId)}`
                              : change?.kind === "only_here"
                                ? item.replaces
                                  ? `Swap for ${item.replaces.code}`
                                  : `Not in ${other.name}`
                                : null;
                          return (
                            // Unchanged courses sit flat, like finished terms on the board; changed ones are raised and labelled.
                            <li key={item.id} className={cn("rounded-xl bg-card p-2.5 text-sm", note ? "shadow-card" : "ring-1 ring-separator")}>
                              <span className="block font-semibold">{item.code}</span>
                              <span className="block truncate text-footnote text-muted-foreground">{item.title}</span>
                              {note && <span className="mt-1 inline-block rounded-full bg-accent px-1.5 py-px text-xs font-medium text-accent-foreground">{note}</span>}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

function problemsOf(planning: Planning, items: readonly PlanItem[], limits: CreditLimits): PlanProblem[] {
  return planProblems({
    terms: planning.terms,
    courses: items.map((item) => ({ ...item, credits: Number(item.credits), coop: item.type.coop })),
    prereqs: planning.prereqs,
    limits,
  });
}
