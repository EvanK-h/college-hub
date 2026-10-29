import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PAGE_CLASS, PageHeader } from "@/components/page-header";
import { PlanNav } from "@/components/pathway/plan-nav";
import { PathwayBoard } from "@/components/pathway/pathway-board";
import { PlanProgressBar } from "@/components/pathway/plan-progress";
import { PrereqGraphView } from "@/components/pathway/prereq-graph";
import { BoardSkeleton } from "@/components/skeletons";
import { buildPrereqGraph } from "@/lib/pathway/graph";
import { planProgress } from "@/lib/pathway/progress";
import { PATHWAY_COURSE_COLUMNS, summarizeTerms } from "@/lib/pathway/summarize";
import { loadSetup } from "@/lib/setup/load";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type PathwayView = "board" | "graph";

// The plan by term, as cards to drag (the board) or as the prerequisite arrows between them (the
// graph). Both are laid out the same way, so they share a page and a toggle (`?view=graph`), and
// switching keeps your place on the page.
export default function PathwayPage({ searchParams }: PageProps<"/pathway">) {
  return (
    <main className={PAGE_CLASS}>
      <PageHeader title="Pathway" nav={<PlanNav />} />
      <Suspense fallback={<BoardSkeleton />}>
        {searchParams.then((params) => (
          <Terms view={params.view === "graph" ? "graph" : "board"} />
        ))}
      </Suspense>
    </main>
  );
}

async function Terms({ view }: { view: PathwayView }) {
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
  const terms = summarizeTerms(termsResult.data);

  if (view === "graph") {
    const graph = buildPrereqGraph(
      terms,
      terms.flatMap((term) =>
        term.courses.map((course) => ({ id: course.id, code: course.code, title: course.title, status: course.status, color: course.type.color, termId: term.id })),
      ),
      prereqs,
    );
    // Each focus with a goal course gets a chain the graph can shade.
    const chains = setup.focuses.flatMap((focus) => (focus.goalCode ? [{ name: focus.name, goal: focus.goalCode }] : []));
    return (
      <div className="flex flex-col gap-5">
        <PlanProgressBar progress={planProgress(terms)} creditUnit={setup.profile.creditUnit} />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <ViewToggle view={view} />
          <p className="max-w-prose text-footnote text-muted-foreground">
            Each arrow runs from a requirement to the course that needs it. Select a course to trace its chain.
          </p>
        </div>
        <PrereqGraphView graph={graph} chains={chains} />
      </div>
    );
  }

  // What each course counts towards, by name, for its edit dialog.
  const names = new Map(requirementsResult.data.map((requirement) => [requirement.id, requirement.name]));
  const requirements: Record<string, string[]> = {};
  for (const link of linksResult.data) {
    const name = names.get(link.requirement_id);
    if (name) (requirements[link.course_id] ??= []).push(name);
  }

  return (
    <div className="flex flex-col gap-5">
      <PlanProgressBar progress={planProgress(terms)} creditUnit={setup.profile.creditUnit} />
      <ViewToggle view={view} />
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

// Board | Graph. Links rather than buttons, so each view has its own URL, and they don't scroll
// back to the top.
function ViewToggle({ view }: { view: PathwayView }) {
  return (
    <nav aria-label="Pathway view" className="inline-flex w-max rounded-full bg-fill-secondary p-1">
      {(
        [
          { value: "board", label: "Board", href: "/pathway" },
          { value: "graph", label: "Graph", href: "/pathway?view=graph" },
        ] as const
      ).map((option) => (
        <Link
          key={option.value}
          href={option.href}
          scroll={false}
          aria-current={option.value === view ? "page" : undefined}
          className={cn(
            "press rounded-full px-3 py-1 text-sm font-medium",
            option.value === view ? "bg-card text-foreground shadow-card" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </Link>
      ))}
    </nav>
  );
}
