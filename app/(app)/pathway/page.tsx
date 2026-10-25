import { Suspense } from "react";
import { redirect } from "next/navigation";
import { COURSE_TYPE_BORDER } from "@/components/pathway/course-card";
import { TermColumn } from "@/components/pathway/term-column";
import { COURSE_TYPE_LABELS, type CourseType } from "@/lib/pathway/labels";
import { summarizeTerms } from "@/lib/pathway/summarize";
import { createClient } from "@/lib/supabase/server";

export default function PathwayPage() {
  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <h1 className="text-2xl font-semibold tracking-tight">Pathway</h1>
      <Legend />
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <Terms />
      </Suspense>
    </main>
  );
}

// Colour alone should not carry meaning, so the legend names every course type.
function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {(Object.keys(COURSE_TYPE_LABELS) as CourseType[]).map((type) => (
        <li key={type} className="flex items-center gap-1.5">
          <span className={`h-3 border-l-4 ${COURSE_TYPE_BORDER[type]}`} aria-hidden />
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

  const { data, error } = await supabase
    .from("terms")
    .select("id, name, kind, courses(id, code, title, credits, type, status)")
    .order("id");
  if (error) throw new Error(`Loading the pathway failed: ${error.message}`);

  const summaries = summarizeTerms(data);
  const termOptions = summaries.map(({ id, name }) => ({ id, name }));

  return (
    // Scrolls sideways inside its own box; focusable so keyboard users can scroll it too.
    <ol aria-label="Terms" tabIndex={0} className="flex gap-3 overflow-x-auto pb-4">
      {summaries.map((term) => (
        <TermColumn key={term.id} term={term} terms={termOptions} />
      ))}
    </ol>
  );
}
