import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PAGE_CLASS, PageHeader } from "@/components/page-header";
import { PlanNav } from "@/components/pathway/plan-nav";
import { ProgressRing } from "@/components/pathway/progress-ring";
import { RingsDrawn } from "@/components/pathway/rings-drawn";
import { StatusIcon } from "@/components/pathway/status-icon";
import { RequirementsSkeleton } from "@/components/skeletons";
import { coursePath } from "@/lib/courses/slug";
import { summarizeAreas } from "@/lib/pathway/areas";
import { summarizeAttributes } from "@/lib/pathway/attributes";
import { loadSetup } from "@/lib/setup/load";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export default function RequirementsPage() {
  return (
    <main className={PAGE_CLASS}>
      <PageHeader title="Requirements" nav={<PlanNav />} />
      <Suspense fallback={<RequirementsSkeleton />}>
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
    supabase.from("courses").select("id, code, title, status, type:course_types(coop)"),
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
  const attributeRing =
    setup.profile.attributeSetName && attributes.total > 0
      ? [{ label: setup.profile.attributeSetName, counts: attributes, href: "#attributes", headline: true }]
      : [];
  const ring = (summary: (typeof areas)[number]) => ({ label: summary.area.name, counts: summary, href: `#area-${summary.area.id}`, headline: summary.area.headline });
  const headline = [...areas.filter((summary) => summary.area.headline).map(ring), ...attributeRing];
  const rest = areas.filter((summary) => !summary.area.headline).map(ring);

  if (headline.length + rest.length === 0) return <p className="text-muted-foreground">No requirements yet. Add them to your data folder and import it.</p>;

  const met = (requirement: (typeof requirements)[number]) => (requirement.total_courses ?? 0) > 0 && requirement.done_courses === requirement.total_courses;
  // "Show unmet only" is a plain checkbox; rows and sections that are met hide with CSS when it's
  // checked (`group-has-…`), so the filter needs no client code and works before hydration.
  const hideWhenFiltering = "group-has-[#unmet-only:checked]/requirements:hidden";

  return (
    <div className="group/requirements flex flex-col gap-8">
      <RingsDrawn />
      <section aria-label="Progress by area" className="flex flex-col gap-3">
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="size-2 rounded-full bg-status-done" />
            Done
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="size-2 rounded-full bg-status-in-progress" />
            In progress
          </span>
          <span>Counted in courses; the centre shows how many are done.</span>
        </p>
        {headline.length > 0 && (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-3">
            {headline.map((entry) => (
              <li key={entry.label}>
                <ProgressRing label={entry.label} counts={entry.counts} href={entry.href} />
              </li>
            ))}
          </ul>
        )}
        {rest.length > 0 && (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((entry) => (
              <li key={entry.label}>
                <ProgressRing label={entry.label} counts={entry.counts} href={entry.href} size="small" />
              </li>
            ))}
          </ul>
        )}
      </section>

      <label className="flex w-max cursor-pointer items-center gap-2 px-1 text-sm font-medium">
        <input id="unmet-only" type="checkbox" className="size-4 accent-primary" />
        Show unmet only
      </label>

      {areas.map(({ area }) => {
        const inArea = requirements.filter((requirement) => requirement.area_id === area.id);
        return (
          <section
            key={area.id}
            id={`area-${area.id}`}
            aria-labelledby={`area-${area.id}-title`}
            className={cn("flex scroll-mt-24 flex-col gap-3", inArea.every(met) && hideWhenFiltering)}
          >
            <h2 id={`area-${area.id}-title`} className="px-1 text-title-3">
              {area.name}
            </h2>
            <ul className="divide-y divide-separator overflow-hidden rounded-2xl bg-card text-card-foreground shadow-card">
              {inArea.map((requirement) => (
                <li key={requirement.requirement_id} className={cn("px-4 py-3.5", met(requirement) && hideWhenFiltering)}>
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-sm font-semibold">{requirement.name}</h3>
                    <span className="shrink-0 text-xs text-tertiary-foreground tabular-nums">
                      {requirement.done_courses}/{requirement.total_courses} courses done
                    </span>
                  </div>
                  <ul className="mt-2 flex flex-wrap gap-x-1 gap-y-1">
                    {(linksByRequirement.get(requirement.requirement_id) ?? []).map(({ course_id }) => {
                      const course = courseById.get(course_id);
                      if (!course) return null;
                      const body = (
                        <>
                          <StatusIcon status={course.status} className="size-4 shrink-0" />
                          <span className="font-medium text-foreground">{course.code}</span> {course.title}
                        </>
                      );
                      const chip = "-mx-0.5 flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted-foreground";
                      return (
                        <li key={course.id}>
                          {/* Co-op placements are entries in the plan, not courses with a page. */}
                          {course.type?.coop ? (
                            <span className={chip}>{body}</span>
                          ) : (
                            <Link href={coursePath(course.code)} className={cn(chip, "hover:bg-fill-tertiary focus-visible:outline-2 focus-visible:outline-ring")}>
                              {body}
                            </Link>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {attributeRing.length > 0 && (
        <section
          id="attributes"
          aria-labelledby="attributes-title"
          className={cn("flex scroll-mt-24 flex-col gap-3", attributes.done === attributes.total && hideWhenFiltering)}
        >
          <h2 id="attributes-title" className="px-1 text-title-3">
            {setup.profile.attributeSetName}
          </h2>
          <ul className="flex flex-wrap gap-2 rounded-2xl bg-card p-4 shadow-card">
            {attributes.codes.map((entry) => (
              <li
                key={entry.code}
                className={cn("flex items-center gap-1.5 rounded-lg bg-fill-tertiary px-2.5 py-1 text-sm font-medium", entry.state === "done" && hideWhenFiltering)}
              >
                <StatusIcon status={entry.state} className="size-4" />
                {entry.code}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
