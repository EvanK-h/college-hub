import { z } from "zod";

// Zod drops any field not listed here, so each schema names only what the sync uses.
// Ids, titles and URLs are required so a real Canvas change fails loudly; the rest is
// nullable or optional so a harmless gap doesn't break the whole sync.

const timestamp = z.iso.datetime({ offset: true });

export const canvasEnrollmentSchema = z.object({
  computed_current_score: z.number().nullish(),
  computed_current_grade: z.string().nullish(),
});

export const canvasCourseSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  course_code: z.string().nullish(),
  enrollments: z.array(canvasEnrollmentSchema).optional(),
});

export const canvasSubmissionSchema = z.object({
  workflow_state: z.string(),
  score: z.number().nullish(),
  submitted_at: timestamp.nullish(),
});

export const canvasAssignmentSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  assignment_group_id: z.number().int(),
  due_at: timestamp.nullish(),
  points_possible: z.number().nullish(),
  html_url: z.url(),
  submission_types: z.array(z.string()).default([]),
  submission: canvasSubmissionSchema.nullish(),
});

export const canvasAssignmentGroupSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  position: z.number().int().nullish(),
  group_weight: z.number().nullish(),
  assignments: z.array(canvasAssignmentSchema).default([]),
});

export const canvasAnnouncementSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  message: z.string().nullish(),
  posted_at: timestamp.nullish(),
  html_url: z.url(),
  user_name: z.string().nullish(),
});

export type CanvasCourse = z.infer<typeof canvasCourseSchema>;
export type CanvasAssignment = z.infer<typeof canvasAssignmentSchema>;
export type CanvasAssignmentGroup = z.infer<typeof canvasAssignmentGroupSchema>;
export type CanvasAnnouncement = z.infer<typeof canvasAnnouncementSchema>;
