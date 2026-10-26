import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PAGE_CLASS, PageHeader } from "@/components/page-header";
import { COURSE_TYPE_SWATCH } from "@/components/pathway/course-card";
import { TermColumn } from "@/components/pathway/term-column";
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
          <span className={`size-2 rounded-full ${COURSE_TYPE_SWATCH[type]}`} aria-hidden />
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
    // Scrolls sideways inside its own box; focusable so keyboard users can scroll it too. It bleeds to
    // the page edges and snaps to columns so a flick lands on a whole term. `relative` makes it the
    // containing block for the cards' absolutely positioned sr-only labels; without it they escape the
    // scroll box and widen the whole page.
    <ol
      aria-label="Terms"
      tabIndex={0}
      className="relative -mx-4 flex snap-x snap-proximity scroll-px-4 items-start gap-3 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:scroll-px-6 sm:px-6"
    >
      {summaries.map((term) => (
        <TermColumn key={term.id} term={term} terms={termOptions} />
      ))}
    </ol>
  );
}
