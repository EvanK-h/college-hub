import { CircleCheck } from "lucide-react";
import { CourseLinkForm } from "@/components/settings/course-link-form";
import { Card } from "@/components/ui/card";
import { canvasCourseOptions, suggestCanvasCourse } from "@/lib/canvas/course-links";
import { loadCanvasCourses } from "@/lib/canvas/load-courses";
import { createClient } from "@/lib/supabase/server";

// Only linked courses are synced, so this is where the first sync gets its list.
// The caller has already checked the session; the queries below run with it, so RLS applies.
export async function CourseLinks({ term }: { term: { id: number; name: string } | null }) {
  if (!term) {
    return (
      <p className="text-sm text-muted-foreground">
        No current term yet. Mark a course as in progress on the pathway and its courses will appear here.
      </p>
    );
  }

  const supabase = await createClient();
  const [coursesResult, canvas] = await Promise.all([
    supabase.from("courses").select("id, code, title, canvas_course_id").eq("term_id", term.id).order("code"),
    loadCanvasCourses(),
  ]);
  if (coursesResult.error) throw new Error(`Loading course links failed: ${coursesResult.error.message}`);

  const courses = coursesResult.data;
  if (courses.length === 0) {
    return <p className="text-sm text-muted-foreground">No courses in {term.name}.</p>;
  }
  const canvasCourses = canvas.ok ? canvas.courses : [];

  return (
    <div className="flex flex-col gap-3">
      {!canvas.ok && (
        <p role="status" className="text-sm text-muted-foreground">
          Couldn&rsquo;t load your Canvas courses because {canvas.reason}. Links you have already saved still work.
        </p>
      )}
      <Card>
        <ul className="divide-y divide-separator">
          {courses.map((course) => {
            const suggestion =
              course.canvas_course_id === null ? suggestCanvasCourse(course.code, canvasCourses) : null;
            const selected = course.canvas_course_id ?? suggestion;

            return (
              <li
                key={course.id}
                className="grid gap-3 px-(--card-spacing) py-3 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] sm:items-start sm:gap-6"
              >
                <div className="flex flex-col gap-0.5">
                  <p className="font-medium">{course.code}</p>
                  <p className="text-sm text-muted-foreground">{course.title}</p>
                  {course.canvas_course_id !== null ? (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <CircleCheck aria-hidden className="size-3.5 text-status-done" />
                      Linked
                    </p>
                  ) : (
                    <p className="mt-0.5 text-xs text-tertiary-foreground">Not linked, so it isn&rsquo;t synced</p>
                  )}
                </div>
                <CourseLinkForm
                  courseId={course.id}
                  courseCode={course.code}
                  options={canvasCourseOptions(canvasCourses, course.canvas_course_id)}
                  defaultValue={selected === null ? "" : String(selected)}
                  suggested={suggestion !== null}
                  disabled={!canvas.ok}
                />
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
