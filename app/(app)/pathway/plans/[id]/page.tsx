import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CircleAlert } from "lucide-react";
import { applyPlan, deletePlan, movePlanItem, removePlanSwap } from "../actions";
import { PAGE_CLASS, PageHeader } from "@/components/page-header";
import { PathwayBoard } from "@/components/pathway/pathway-board";
import { ConfirmAction } from "@/components/plans/confirm-action";
import { PlanSwapForm, type SwapChoiceGroup } from "@/components/plans/plan-swap-form";
import { PlanSkeleton } from "@/components/skeletons";
import { Button, buttonVariants } from "@/components/ui/button";
import { describeProblem, planProblems } from "@/lib/pathway/move-checks";
import { buildPlan, comparePlans, parseSwapCourse, swapItemId, type PlanItem } from "@/lib/plans/build";
import { loadPlanning, loadPlanRows, planTerms, type Planning } from "@/lib/plans/load";
import { loadSetup } from "@/lib/setup/load";
import type { SlotInfo } from "@/lib/setup/setup";
import { createClient } from "@/lib/supabase/server";

// The plan comes from the URL and your session, so it renders inside Suspense (see the Cache
// Components decision).
export default function PlanPage({ params }: PageProps<"/pathway/plans/[id]">) {
  return (
    <main className={PAGE_CLASS}>
      <Suspense fallback={<PlanSkeleton />}>{params.then(({ id }) => <Plan id={id} />)}</Suspense>
    </main>
  );
}

async function Plan({ id }: { id: string }) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  // The proxy already redirects signed-out visitors; this is a second check in case it is ever bypassed.
  if (!claims?.claims) redirect("/login");
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const [planning, saved, setup] = await Promise.all([loadPlanning(supabase), loadPlanRows(supabase, id), loadSetup()]);
  const { creditLimits, creditUnit } = setup.profile;
  if (!saved) notFound();

  const items = buildPlan(planning.courses, saved.rows, planning.swaps);
  const changes = [...comparePlans(items, buildPlan(planning.courses, [], planning.swaps)).values()];
  const moves = changes.filter((change) => change.kind === "moved").length;
  const swapped = items.filter((item) => item.replaces);
  const labels = Object.fromEntries(swapped.map((item) => [item.id, `Swap for ${item.replaces?.code}`]));
  const termName = (termId: number) => planning.terms.find((term) => term.id === termId)?.name ?? "that term";
  const problems = planProblems({
    terms: planning.terms,
    courses: items.map((item) => ({ ...item, credits: Number(item.credits), coop: item.type.coop })),
    prereqs: planning.prereqs,
    limits: creditLimits,
  });

  return (
    <>
      <PageHeader back={{ href: "/pathway/plans", label: "What-if plans" }} title={saved.plan.name}>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Link href={`/pathway/plans/compare?a=${id}&b=current`} className={buttonVariants({ variant: "outline" })}>
            Compare with current
          </Link>
          <ConfirmAction
            label="Make active"
            title={`Make “${saved.plan.name}” your plan?`}
            description={`This makes ${moves} ${moves === 1 ? "move" : "moves"} and ${swapped.length} ${swapped.length === 1 ? "swap" : "swaps"} to your real plan. A swapped-in course takes over the replaced course's requirement slot; its attributes and notes start empty.`}
            confirmLabel="Make active"
            action={applyPlan.bind(null, id)}
          />
          <ConfirmAction
            label="Delete"
            title={`Delete “${saved.plan.name}”?`}
            description="The what-if plan is deleted. Your real plan is not changed."
            confirmLabel="Delete plan"
            destructive
            action={deletePlan.bind(null, id)}
          />
        </div>
      </PageHeader>

      {problems.length > 0 && (
        <ul aria-label="Problems in this plan" className="flex flex-col gap-1.5 rounded-2xl bg-fill-tertiary p-4 text-sm">
          {problems.map(({ termId, courseCode, problem }, index) => (
            <li key={index} className="flex gap-2 text-destructive">
              <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
              {courseCode ? `${courseCode}: ` : ""}
              {describeProblem(problem, termName(termId), creditUnit)}
            </li>
          ))}
        </ul>
      )}

      <section aria-labelledby="plan-swaps" className="flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-card">
        <h2 id="plan-swaps" className="text-headline">
          Swaps
        </h2>
        {swapped.length > 0 && (
          <ul className="flex flex-col gap-2">
            {swapped.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                <span>
                  <span className="font-semibold">{item.code}</span> {item.title}
                  <span className="text-muted-foreground"> in place of {item.replaces?.code}</span>
                </span>
                <form action={removePlanSwap.bind(null, id, item.id.replace(/^swap:/, ""))}>
                  <Button type="submit" variant="outline" size="sm">
                    Undo
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <PlanSwapForm planId={id} groups={swapChoices(planning, items, setup.slots)} />
      </section>

      <PathwayBoard
        terms={planTerms(planning.terms, items)}
        prereqs={planning.prereqs}
        limits={creditLimits}
        creditUnit={creditUnit}
        onMove={movePlanItem.bind(null, id)}
        editable={false}
        labels={labels}
      />

    </>
  );
}

/**
 * Swaps that could still go into the plan: each pairing of a swap with a planned course it can
 * replace, skipping swaps already in the plan, courses already swapped out, and swap names that
 * aren't a single course (those couldn't be made real later).
 */
function swapChoices(planning: Planning, items: readonly PlanItem[], slots: readonly SlotInfo[]): SwapChoiceGroup[] {
  const inPlan = new Set(items.map((item) => item.id));
  const codeOf = new Map(items.map((item) => [item.id, item.code]));
  const groups = new Map<string, SwapChoiceGroup>();
  for (const swap of planning.swaps) {
    if (!parseSwapCourse(swap.swapIn) || inPlan.has(swapItemId(swap.id))) continue;
    for (const courseId of swap.replaces) {
      const course = planning.courses.find((c) => c.id === courseId);
      if (course?.status !== "planned" || !inPlan.has(courseId)) continue;
      const label = slots.find((slot) => slot.id === swap.slotId)?.name ?? "Other";
      const group = groups.get(label) ?? { label, choices: [] };
      group.choices.push({ value: `${swap.id}:${courseId}`, label: `${swap.swapIn}, for ${codeOf.get(courseId)}` });
      groups.set(label, group);
    }
  }
  return [...groups.values()];
}
