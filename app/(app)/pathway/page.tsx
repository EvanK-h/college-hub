import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PAGE_CLASS, PageHeader } from "@/components/page-header";
import { PlanNav } from "@/components/pathway/plan-nav";
import { PathwayBoard } from "@/components/pathway/pathway-board";
import { PlanProgressBar } from "@/components/pathway/plan-progress";
import { BoardSkeleton } from "@/components/skeletons";
import { planProgress } from "@/lib/pathway/progress";
import { PATHWAY_COURSE_COLUMNS, summarizeTerms } from "@/lib/pathway/summarize";
import { loadSetup } from "@/lib/setup/load";
import { createClient } from "@/lib/supabase/server";

export default function PathwayPage() {
  return (
    <main className={PAGE_CLASS}>
      <PageHeader title="Pathway" nav={<PlanNav />} />
      <Suspense fallback={<BoardSkeleton />}>
        <Terms />
      </Suspense>
    </main>
  );
}

async function Terms() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  // The proxy already redirects signed-out visitors; this is a second check in case it is ever bypassed.
  if (!claims?.claims) redirect("/login");

  const [termsResult, prereqsResult, requirementsResult, linksResult, setup] = await Promise.all([
    supabase.from("terms").select(`id, name, kind, courses(${PATHWAY_COURSE_COLUMNS})`).order("id"),
    supabase.from("course_prereqs").select("course_id, requires_code, kind, option_group"),
    supabase.from("requirements").select("id, name").order("name"),
    supabase.from("course_requirements").select("requirement_id, course_id"),
    loadSetup(),
  ]);
  if (termsResult.error) throw new Error(`Loading the pathway failed: ${termsResult.error.message}`);
  if (prereqsResult.error) throw new Error(`Loading prerequisites failed: ${prereqsResult.error.message}`);
  if (requirementsResult.error) throw new Error(`Loading requirements failed: ${requirementsResult.error.message}`);
  if (linksResult.error) throw new Error(`Loading requirement courses failed: ${linksResult.error.message}`);

  const prereqs = prereqsResult.data.map((row) => ({
    courseId: row.course_id,
    requiresCode: row.requires_code,
    kind: row.kind,
    group: row.option_group,
  }));

  // What each course counts towards, by name, for its edit dialog.
  const names = new Map(requirementsResult.data.map((requirement) => [requirement.id, requirement.name]));
  const requirements: Record<string, string[]> = {};
  for (const link of linksResult.data) {
    const name = names.get(link.requirement_id);
    if (name) (requirements[link.course_id] ??= []).push(name);
  }
  const terms = summarizeTerms(termsResult.data);

  return (
    <div className="flex flex-col gap-5">
      <PlanProgressBar progress={planProgress(terms)} creditUnit={setup.profile.creditUnit} />
      <PathwayBoard
        terms={terms}
        prereqs={prereqs}
        limits={setup.profile.creditLimits}
        creditUnit={setup.profile.creditUnit}
        courseTypes={setup.courseTypes}
        requirements={requirements}
      />
    </div>
  );
}
