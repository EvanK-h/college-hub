import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PAGE_CLASS, PageHeader } from "@/components/page-header";
import { PrereqGraphView } from "@/components/pathway/prereq-graph";
import { buildPrereqGraph } from "@/lib/pathway/graph";
import { loadSetup } from "@/lib/setup/load";
import { createClient } from "@/lib/supabase/server";

export default function GraphPage() {
  return (
    <main className={PAGE_CLASS}>
      <PageHeader
        eyebrow="Degree plan"
        title="Prerequisites"
        description="Each arrow runs from a requirement to the course that needs it, laid out by term. Select a course to trace its chain."
      />
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <Graph />
      </Suspense>
    </main>
  );
}

async function Graph() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  // The proxy already redirects signed-out visitors; this is a second check in case it is ever bypassed.
  if (!claims?.claims) redirect("/login");

  const [termsResult, coursesResult, prereqsResult, setup] = await Promise.all([
    supabase.from("terms").select("id, name").order("id"),
    supabase.from("courses").select("id, code, title, status, term_id, course_types(color)"),
    supabase.from("course_prereqs").select("course_id, requires_code, kind, option_group"),
    loadSetup(),
  ]);
  if (termsResult.error) throw new Error(`Loading terms failed: ${termsResult.error.message}`);
  if (coursesResult.error) throw new Error(`Loading courses failed: ${coursesResult.error.message}`);
  if (prereqsResult.error) throw new Error(`Loading prerequisites failed: ${prereqsResult.error.message}`);

  const graph = buildPrereqGraph(
    termsResult.data,
    coursesResult.data.map(({ term_id, course_types, ...course }) => ({ ...course, color: course_types.color, termId: term_id })),
    prereqsResult.data.map((row) => ({ courseId: row.course_id, requiresCode: row.requires_code, kind: row.kind, group: row.option_group })),
  );

  // Each focus with a goal course gets a chain the graph can shade.
  const chains = setup.focuses.flatMap((focus) => (focus.goalCode ? [{ name: focus.name, goal: focus.goalCode }] : []));

  return <PrereqGraphView graph={graph} chains={chains} />;
}
