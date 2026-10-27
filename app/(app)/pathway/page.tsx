import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PAGE_CLASS, PageHeader } from "@/components/page-header";
import { COURSE_TYPE_COLOR } from "@/components/pathway/course-card";
import { PathwayBoard } from "@/components/pathway/pathway-board";
import { COURSE_TYPE_LABELS, type CourseType } from "@/lib/pathway/labels";
import { summarizeTerms } from "@/lib/pathway/summarize";
import { createClient } from "@/lib/supabase/server";

export default function PathwayPage() {
  return (
    <main className={PAGE_CLASS}>
      <PageHeader eyebrow="Degree plan" title="Pathway">
        <Legend />
      </PageHeader>
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <Terms />
      </Suspense>
    </main>
  );
}

// Colour alone should not carry meaning, so the legend names every course type.
function Legend() {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      {(Object.keys(COURSE_TYPE_LABELS) as CourseType[]).map((type) => (
        <li key={type} className="flex items-center gap-1.5">
          <span className={`size-2 rounded-full bg-(--course) ${COURSE_TYPE_COLOR[type]}`} aria-hidden />
          {COURSE_TYPE_LABELS[type]}
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

  const [termsResult, prereqsResult] = await Promise.all([
    supabase.from("terms").select("id, name, kind, courses(id, code, title, credits, type, status)").order("id"),
    supabase.from("course_prereqs").select("course_id, requires_code, kind, option_group"),
  ]);
  if (termsResult.error) throw new Error(`Loading the pathway failed: ${termsResult.error.message}`);
  if (prereqsResult.error) throw new Error(`Loading prerequisites failed: ${prereqsResult.error.message}`);

  const prereqs = prereqsResult.data.map((row) => ({
    courseId: row.course_id,
    requiresCode: row.requires_code,
    kind: row.kind,
    group: row.option_group,
  }));

  return <PathwayBoard terms={summarizeTerms(termsResult.data)} prereqs={prereqs} />;
}
