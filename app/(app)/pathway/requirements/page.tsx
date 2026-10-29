import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PAGE_CLASS, PageHeader } from "@/components/page-header";
import { ProgressRing } from "@/components/pathway/progress-ring";
import { StatusIcon } from "@/components/pathway/status-icon";
import { summarizeAreas } from "@/lib/pathway/areas";
import { summarizeAttributes } from "@/lib/pathway/attributes";
import { loadSetup } from "@/lib/setup/load";
import { createClient } from "@/lib/supabase/server";

export default function RequirementsPage() {
  return (
    <main className={PAGE_CLASS}>
      <PageHeader eyebrow="Degree plan" title="Requirements" />
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
  const [requirementsResult, linksResult, coursesResult, attributesResult, setup] = await Promise.all([
    supabase.from("requirement_progress").select("*").order("name"),
    supabase.from("course_requirements").select("requirement_id, course_id"),
    supabase.from("courses").select("id, code, title, status"),
    supabase.from("course_attributes").select("course_id, attribute_id"),
    loadSetup(),
  ]);
  if (requirementsResult.error) throw new Error(`Loading requirements failed: ${requirementsResult.error.message}`);
  if (linksResult.error) throw new Error(`Loading requirement courses failed: ${linksResult.error.message}`);
  if (coursesResult.error) throw new Error(`Loading courses failed: ${coursesResult.error.message}`);
  if (attributesResult.error) throw new Error(`Loading course attributes failed: ${attributesResult.error.message}`);

  const requirements = requirementsResult.data;
  const courseById = new Map(coursesResult.data.map((course) => [course.id, course]));
  const linksByRequirement = Map.groupBy(linksResult.data, (link) => link.requirement_id);
  const areas = summarizeAreas(
    setup.areas,
    requirements.map((requirement) => ({
      areaId: requirement.area_id,
      courses: (linksByRequirement.get(requirement.requirement_id) ?? []).flatMap(
        ({ course_id }) => courseById.get(course_id) ?? [],
      ),
    })),
  );

  // The attribute ring (NUpath for Northeastern) sits right after the headline areas.
  const attributeIds = Map.groupBy(attributesResult.data, (link) => link.course_id);
  const attributes = summarizeAttributes(
    setup.attributes,
    coursesResult.data.map((course) => ({ status: course.status, attributeIds: (attributeIds.get(course.id) ?? []).map((link) => link.attribute_id) })),
  );
  const attributeRing = setup.profile.attributeSetName && attributes.total > 0 ? [{ label: setup.profile.attributeSetName, counts: attributes }] : [];
  const rings = [
    ...areas.filter((summary) => summary.area.headline).map((summary) => ({ label: summary.area.name, counts: summary })),
    ...attributeRing,
    ...areas.filter((summary) => !summary.area.headline).map((summary) => ({ label: summary.area.name, counts: summary })),
  ];

  if (rings.length === 0) return <p className="text-muted-foreground">No requirements yet. Add them to your data folder and import it.</p>;

  return (
    <>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-3">
        {rings.map((ring) => (
          <li key={ring.label}>
            <ProgressRing label={ring.label} counts={ring.counts} />
          </li>
        ))}
      </ul>

      {areas.map(({ area }) => (
        <section key={area.id} aria-labelledby={`area-${area.id}`} className="flex flex-col gap-3">
          <h2 id={`area-${area.id}`} className="px-1 text-title-3">
            {area.name}
          </h2>
          <ul className="divide-y divide-separator overflow-hidden rounded-2xl bg-card text-card-foreground shadow-card">
            {requirements
              .filter((requirement) => requirement.area_id === area.id)
              .map((requirement) => (
                <li key={requirement.requirement_id} className="px-4 py-3.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-sm font-semibold">{requirement.name}</h3>
                    <span className="shrink-0 text-xs text-tertiary-foreground tabular-nums">
                      {requirement.done_courses}/{requirement.total_courses} courses done
                    </span>
                  </div>
                  <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
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
