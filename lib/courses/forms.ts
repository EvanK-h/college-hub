import { z } from "zod";

// Everything the browser sends is untrusted, so each course-page action validates it with these first.

const notesSchema = z.object({
  courseId: z.uuid(),
  // An empty box clears the notes.
  notes: z.string().max(10_000, "Notes are limited to 10,000 characters.").transform((text) => text.trim() || null),
});

export function parseCourseNotes(formData: FormData) {
  return notesSchema.safeParse({ courseId: formData.get("courseId"), notes: formData.get("notes") ?? "" });
}

const announcementFlagSchema = z.object({
  announcementId: z.uuid(),
  flag: z.enum(["read", "important"]),
  value: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export function parseAnnouncementFlag(formData: FormData) {
  return announcementFlagSchema.safeParse({
    announcementId: formData.get("announcementId"),
    flag: formData.get("flag"),
    value: formData.get("value"),
  });
}

const assignmentProgressSchema = z.object({
  assignmentId: z.uuid(),
  progress: z.enum(["not_started", "in_progress"]),
});

export function parseAssignmentProgress(formData: FormData) {
  return assignmentProgressSchema.safeParse({
    assignmentId: formData.get("assignmentId"),
    progress: formData.get("progress"),
  });
}
