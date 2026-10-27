import { z } from "zod";

// Everything the browser sends is untrusted, so the action validates it with this schema first.
const courseUpdateSchema = z.object({
  courseId: z.uuid(),
  status: z.enum(["planned", "in_progress", "done"]),
  termId: z.coerce.number().int().min(0),
});

export type CourseUpdate = z.infer<typeof courseUpdateSchema>;

export function parseCourseUpdate(formData: FormData) {
  return courseUpdateSchema.safeParse({
    courseId: formData.get("courseId"),
    status: formData.get("status"),
    termId: formData.get("termId"),
  });
}

const courseMoveSchema = z.object({
  courseId: z.uuid(),
  termId: z.number().int().min(0),
});

/** A drag-and-drop move, sent as plain values rather than a form. */
export function parseCourseMove(input: unknown) {
  return courseMoveSchema.safeParse(input);
}
