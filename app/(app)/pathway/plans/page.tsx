import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { PAGE_CLASS, PageHeader } from "@/components/page-header";
import { PlanNav } from "@/components/pathway/plan-nav";
import { NewPlanDialog } from "@/components/plans/new-plan-dialog";
import { PlanMenu } from "@/components/plans/plan-menu";
import { CardListSkeleton } from "@/components/skeletons";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NATIVE_SELECT_CLASS } from "@/components/ui/native-select";
import { buildPlan, countChanges } from "@/lib/plans/build";
import { loadPlanning } from "@/lib/plans/load";
import { createClient } from "@/lib/supabase/server";

export default function PlansPage() {
  return (
    <main className={PAGE_CLASS}>
      <PageHeader
        nav={<PlanNav />}
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

  // One list: each plan opens from its name, compares with the current plan from its row, and keeps
  // Rename and Delete in a ⋯ menu. Comparing any two plans folds away underneath.
  return (
    <>
      <section aria-labelledby="saved-plans" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 px-1">
          <h2 id="saved-plans" className="text-title-3">
            Saved plans
          </h2>
          <NewPlanDialog plans={plans.map(({ id, name }) => ({ id, name }))} />
        </div>
        {plans.length === 0 ? (
          <p className="px-1 text-muted-foreground">No what-if plans yet. Start one from your current plan with New plan.</p>
        ) : (
          <ul className="divide-y divide-separator rounded-2xl bg-card shadow-card">
            {plans.map((plan) => (
              <li key={plan.id} className="flex items-center gap-2 py-2 pr-3 pl-4">
                <Link
                  href={`/pathway/plans/${plan.id}`}
                  className="-my-1 -ml-2 flex min-w-0 flex-1 flex-col rounded-lg px-2 py-1 hover:bg-fill-tertiary focus-visible:outline-2 focus-visible:outline-ring sm:flex-row sm:items-baseline sm:gap-3"
                >
                  <span className="truncate text-headline">{plan.name}</span>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {plan.changes === 0 ? "Same as the current plan" : `${plan.changes} ${plan.changes === 1 ? "change" : "changes"}`}
                  </span>
                </Link>
                <Link href={`/pathway/plans/compare?a=${plan.id}&b=current`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  Compare
                </Link>
                <PlanMenu plan={{ id: plan.id, name: plan.name }} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {plans.length > 1 && (
        <details className="group flex flex-col gap-3">
          <summary className="flex w-max cursor-pointer list-none items-center gap-1.5 rounded-lg px-1 text-sm font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
            <ChevronRight aria-hidden className="size-4 transition-transform group-open:rotate-90" />
            Compare two plans
          </summary>
          {/* A plain GET form: the comparison is a page with its own URL, so it can be revisited. */}
          <form action="/pathway/plans/compare" className="mt-3 grid gap-3 rounded-2xl bg-card p-5 shadow-card sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            {(["a", "b"] as const).map((side, index) => (
              <div key={side} className="grid gap-1.5">
                <Label htmlFor={`compare-${side}`}>{index === 0 ? "Plan" : "Against"}</Label>
                <select id={`compare-${side}`} name={side} defaultValue={index === 0 ? plans[0]?.id : plans[1]?.id} className={NATIVE_SELECT_CLASS}>
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
        </details>
      )}
    </>
  );
}
