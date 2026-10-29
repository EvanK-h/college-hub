import type { Database } from "@/lib/database.types";

export type CourseStatus = Database["public"]["Enums"]["course_status"];

export const COURSE_STATUS_LABELS: Record<CourseStatus, string> = {
  planned: "Planned",
  in_progress: "In progress",
  done: "Done",
};

export type Relevance = Database["public"]["Enums"]["relevance"];

export const RELEVANCE_LABELS: Record<Relevance, string> = {
  none: "None",
  lower: "Lower",
  low: "Low",
  medium: "Medium",
  high: "High",
};
