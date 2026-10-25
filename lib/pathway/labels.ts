import type { Database } from "@/lib/database.types";

export type CourseType = Database["public"]["Enums"]["course_type"];
export type CourseStatus = Database["public"]["Enums"]["course_status"];

export const COURSE_TYPE_LABELS: Record<CourseType, string> = {
  cs_core: "CS core",
  ai_concentration: "AI concentration",
  physics_minor: "Physics minor",
  major_support: "Major support",
  general_elective: "General elective",
  coop_program: "Co-op / program",
};

export const COURSE_STATUS_LABELS: Record<CourseStatus, string> = {
  planned: "Planned",
  in_progress: "In progress",
  done: "Done",
};

export type ReqArea = Database["public"]["Enums"]["req_area"];

export const REQ_AREA_LABELS: Record<ReqArea, string> = {
  cs_overview: "CS overview",
  cs_fundamentals: "CS fundamentals",
  cs_required: "CS required",
  security_presentation: "Security and presentation",
  khoury_electives: "Khoury electives",
  supporting: "Supporting courses",
  writing: "Writing",
  ai_concentration: "AI concentration",
  physics_minor: "Physics minor",
  universitywide: "Universitywide",
};
