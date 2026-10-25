import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ProgressRing } from "@/components/pathway/progress-ring";
import { StatusIcon } from "@/components/pathway/status-icon";
import { HEADLINE_AREAS, summarizeAreas } from "@/lib/pathway/areas";
import { REQ_AREA_LABELS } from "@/lib/pathway/labels";
import { summarizeNupath } from "@/lib/pathway/nupath";
import { createClient } from "@/lib/supabase/server";

export default function RequirementsPage() {
  return (
    <main className="flex flex-1 flex-col gap-6 p-4">
      <h1 className="text-2xl font-semibold tracking-tight">Requirements</h1>
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <Requirements />
      </Suspense>
    </main>
  );
}

async function Requirements() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  // The proxy already redirects signed-out visitors; this is a second check in case it is ever bypassed.
  if (!claims?.claims) redirect("/login");

  // The generated types do not describe embedded rows across these relations reliably, so
  // courses and links are fetched flat and joined by id here.
  const [requirementsResult, linksResult, coursesResult] = await Promise.all([
    supabase.from("requirement_progress").select("*").order("name"),
    supabase.from("course_requirements").select("requirement_id, course_id"),
    supabase.from("courses").select("id, code, title, nupath, status"),
  ]);
  if (requirementsResult.error) throw new Error(`Loading requirements failed: ${requirementsResult.error.message}`);
  if (linksResult.error) throw new Error(`Loading requirement courses failed: ${linksResult.error.message}`);
  if (coursesResult.error) throw new Error(`Loading courses failed: ${coursesResult.error.message}`);

  const requirements = requirementsResult.data;
  const courseById = new Map(coursesResult.data.map((course) => [course.id, course]));
  const linksByRequirement = Map.groupBy(linksResult.data, (link) => link.requirement_id);
  const areas = summarizeAreas(requirements);
  const nupath = summarizeNupath(coursesResult.data);

  // NUpath sits right after the headline areas, as the spec lists it.
  const rings = [
    ...areas.filter((summary) => HEADLINE_AREAS.includes(summary.area)).map((summary) => ({ label: REQ_AREA_LABELS[summary.area], counts: summary })),
    { label: "NUpath", counts: nupath },
    ...areas.filter((summary) => !HEADLINE_AREAS.includes(summary.area)).map((summary) => ({ label: REQ_AREA_LABELS[summary.area], counts: summary })),
  ];

  return (
    <>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-4">
        {rings.map((ring) => (
          <li key={ring.label}>
            <ProgressRing label={ring.label} counts={ring.counts} />
          </li>
        ))}
      </ul>

      {areas.map(({ area }) => (
        <section key={area} aria-labelledby={`area-${area}`} className="flex flex-col gap-2">
          <h2 id={`area-${area}`} className="text-lg font-semibold">
            {REQ_AREA_LABELS[area]}
          </h2>
          <ul className="flex flex-col gap-2">
            {requirements
              .filter((requirement) => requirement.area === area)
              .map((requirement) => (
                <li key={requirement.requirement_id} className="rounded-md border bg-card p-3 text-card-foreground">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-sm font-medium">{requirement.name}</h3>
                    <span className="text-xs text-muted-foreground">
                      {requirement.done_courses}/{requirement.total_courses} courses done
                    </span>
                  </div>
                  <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                    {(linksByRequirement.get(requirement.requirement_id) ?? []).map(({ course_id }) => {
                      const course = courseById.get(course_id);
                      return course ? (
                        <li key={course.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <StatusIcon status={course.status} className="size-3.5" />
                          {course.code} · {course.title}
                        </li>
                      ) : null;
                    })}
                  </ul>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </>
  );
}
