import { z } from "zod";

// Everything the browser sends is untrusted, so the action validates it with this schema first.
// An empty select means "not linked", which is stored as null.
const courseLinkSchema = z.object({
  courseId: z.uuid(),
  canvasCourseId: z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : Number(value)))
    .pipe(z.number().int().positive().nullable()),
});

export type CourseLink = z.infer<typeof courseLinkSchema>;

export function parseCourseLink(formData: FormData) {
  return courseLinkSchema.safeParse({
    courseId: formData.get("courseId"),
    canvasCourseId: formData.get("canvasCourseId"),
  });
}

type CanvasCourseSummary = { id: number; name: string; course_code?: string | null };

/**
 * The one active Canvas course whose code or name mentions this course's code, or null when there
 * is none or more than one. "CS 2100" matches "CS2100", "CS-2100.202610" and "Fall 2026 CS 2100",
 * but not "CS 21000" or "ACS 2100".
 */
export function suggestCanvasCourse(code: string, canvasCourses: CanvasCourseSummary[]): number | null {
  const parts = code.match(/^([A-Za-z]+)\s*(\d+)/);
  if (!parts) return null;
  const [, letters, digits] = parts;
  const pattern = new RegExp(`(?<![A-Za-z0-9])${letters}[\\s-]*${digits}(?![0-9])`, "i");

  const matches = canvasCourses.filter((course) => pattern.test(`${course.course_code ?? ""} ${course.name}`));
  return matches.length === 1 && matches[0] ? matches[0].id : null;
}

export type CanvasCourseOption = { value: string; label: string };

/**
 * The dropdown's options: "Not linked", then each active Canvas course. A link to a course that is
 * not in the list (a concluded course, or Canvas could not be reached) stays visible and selectable
 * so saving the form never silently drops it.
 */
export function canvasCourseOptions(canvasCourses: CanvasCourseSummary[], linkedId: number | null): CanvasCourseOption[] {
  const options: CanvasCourseOption[] = [
    { value: "", label: "Not linked" },
    ...canvasCourses.map((course) => ({
      value: String(course.id),
      label: course.course_code && course.course_code !== course.name ? `${course.course_code} · ${course.name}` : course.name,
    })),
  ];
  if (linkedId !== null && !canvasCourses.some((course) => course.id === linkedId)) {
    options.push({ value: String(linkedId), label: `Canvas course ${linkedId}` });
  }
  return options;
}
