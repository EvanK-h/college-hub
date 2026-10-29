import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PAGE_CLASS, PageHeader } from "@/components/page-header";
import { NewPlanForm } from "@/components/plans/new-plan-form";
import { CardListSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NATIVE_SELECT_CLASS } from "@/components/ui/native-select";
import { buildPlan, countChanges } from "@/lib/plans/build";
import { loadPlanning } from "@/lib/plans/load";
import { createClient } from "@/lib/supabase/server";

export default function PlansPage() {
  return (
    <main className={PAGE_CLASS}>
      <PageHeader
        eyebrow="Degree plan"
        title="What-if plans"
        description="Save a copy of your plan, move courses and try swaps freely, then compare. Your real plan stays as it is until you make a what-if plan the active one."
      />
      <Suspense fallback={<CardListSkeleton count={2} lines={2} />}>
        <Plans />
      </Suspense>
    </main>
  );
}

async function Plans() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  // The proxy already redirects signed-out visitors; this is a second check in case it is ever bypassed.
  if (!claims?.claims) redirect("/login");

  const [planning, plansResult, rowsResult] = await Promise.all([
    loadPlanning(supabase),
    supabase.from("plans").select("id, name, created_at").order("created_at", { ascending: false }),
    supabase.from("plan_courses").select("plan_id, term_id, course_id, swap_option_id, replaces_course_id"),
  ]);
  if (plansResult.error) throw new Error(`Loading plans failed: ${plansResult.error.message}`);
  if (rowsResult.error) throw new Error(`Loading plans failed: ${rowsResult.error.message}`);

  const real = buildPlan(planning.courses, [], planning.swaps);
  const plans = plansResult.data.map((plan) => {
    const rows = rowsResult.data
      .filter((row) => row.plan_id === plan.id)
      .map((row) => ({ termId: row.term_id, courseId: row.course_id, swapOptionId: row.swap_option_id, replacesCourseId: row.replaces_course_id }));
    return { ...plan, changes: countChanges(buildPlan(planning.courses, rows, planning.swaps), real) };
  });

  return (
    <>
      <section aria-labelledby="new-plan" className="flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-card">
        <h2 id="new-plan" className="text-headline">
          New plan
        </h2>
        <NewPlanForm plans={plans.map(({ id, name }) => ({ id, name }))} />
      </section>

      <section aria-labelledby="saved-plans" className="flex flex-col gap-3">
        <h2 id="saved-plans" className="px-1 text-title-3">
          Saved plans
        </h2>
        {plans.length === 0 ? (
          <p className="px-1 text-muted-foreground">No what-if plans yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {plans.map((plan) => (
              <li key={plan.id}>
                <Link
                  href={`/pathway/plans/${plan.id}`}
                  className="press flex items-baseline justify-between gap-3 rounded-2xl bg-card p-4 shadow-card hover:shadow-raised focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <span className="text-headline">{plan.name}</span>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {plan.changes === 0 ? "Same as the current plan" : `${plan.changes} ${plan.changes === 1 ? "change" : "changes"}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {plans.length > 0 && (
        <section aria-labelledby="compare" className="flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-card">
          <h2 id="compare" className="text-headline">
            Compare two plans
          </h2>
          {/* A plain GET form: the comparison is a page with its own URL, so it can be revisited. */}
          <form action="/pathway/plans/compare" className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            {(["a", "b"] as const).map((side, index) => (
              <div key={side} className="grid gap-1.5">
                <Label htmlFor={`compare-${side}`}>{index === 0 ? "Plan" : "Against"}</Label>
                <select id={`compare-${side}`} name={side} defaultValue={index === 0 ? plans[0]?.id : "current"} className={NATIVE_SELECT_CLASS}>
                  <option value="current">The current plan</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <Button type="submit" variant="outline">
              Compare
            </Button>
          </form>
        </section>
      )}
    </>
  );
}
