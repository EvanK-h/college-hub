import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PAGE_CLASS, PageHeader } from "@/components/page-header";
import { PathwayBoard } from "@/components/pathway/pathway-board";
import { BoardSkeleton, LegendSkeleton } from "@/components/skeletons";
import { buttonVariants } from "@/components/ui/button";
import { PATHWAY_COURSE_COLUMNS, summarizeTerms } from "@/lib/pathway/summarize";
import { loadSetup } from "@/lib/setup/load";
import { categoryClass } from "@/lib/setup/setup";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export default function PathwayPage() {
  return (
    <main className={PAGE_CLASS}>
      <PageHeader eyebrow="Degree plan" title="Pathway">
        <Suspense fallback={<LegendSkeleton />}>
          <Legend />
        </Suspense>
        <Link href="/pathway/plans" className={cn(buttonVariants({ variant: "outline" }), "mt-2 self-start")}>
          What-if plans
        </Link>
      </PageHeader>
      <Suspense fallback={<BoardSkeleton />}>
        <Terms />
      </Suspense>
    </main>
  );
}

// Colour alone should not carry meaning, so the legend names every course type.
async function Legend() {
  const { courseTypes } = await loadSetup();
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      {courseTypes.map((type) => (
        <li key={type.id} className="flex items-center gap-1.5">
          <span className={cn("size-2 rounded-full bg-(--course)", categoryClass(type.color))} aria-hidden />
          {type.name}
        </li>
      ))}
    </ul>
  );
}

async function Terms() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  // The proxy already redirects signed-out visitors; this is a second check in case it is ever bypassed.
  if (!claims?.claims) redirect("/login");

  const [termsResult, prereqsResult, setup] = await Promise.all([
    supabase.from("terms").select(`id, name, kind, courses(${PATHWAY_COURSE_COLUMNS})`).order("id"),
    supabase.from("course_prereqs").select("course_id, requires_code, kind, option_group"),
    loadSetup(),
  ]);
  if (termsResult.error) throw new Error(`Loading the pathway failed: ${termsResult.error.message}`);
  if (prereqsResult.error) throw new Error(`Loading prerequisites failed: ${prereqsResult.error.message}`);

  const prereqs = prereqsResult.data.map((row) => ({
    courseId: row.course_id,
    requiresCode: row.requires_code,
    kind: row.kind,
    group: row.option_group,
  }));

  return (
    <PathwayBoard
      terms={summarizeTerms(termsResult.data)}
      prereqs={prereqs}
      limits={setup.profile.creditLimits}
      creditUnit={setup.profile.creditUnit}
    />
  );
}
