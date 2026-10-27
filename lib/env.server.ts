import "server-only";
import { z } from "zod";
import { parseEnv } from "@/lib/env";

const serverEnvSchema = z.object({
  ALLOWED_EMAIL: z.email(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function getServerEnv(): ServerEnv {
  return parseEnv(serverEnvSchema, { ALLOWED_EMAIL: process.env.ALLOWED_EMAIL });
}

// Separate from getServerEnv so login keeps working when the Canvas variables aren't set.
const canvasEnvSchema = z.object({
  CANVAS_BASE_URL: z.url(),
  CANVAS_TOKEN: z.string().min(1),
});

// For the sync, which writes with the service-role key. OWNER_ID is your user's id in auth.users:
// the service role has no auth.uid(), so the sync has to say whose rows it is writing.
const adminEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  OWNER_ID: z.uuid(),
});

export type AdminEnv = z.infer<typeof adminEnvSchema>;

export function getAdminEnv(): AdminEnv {
  return parseEnv(adminEnvSchema, {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    OWNER_ID: process.env.OWNER_ID,
  });
}

// The shared secret for /api/sync/*. At least 32 characters, so a weak or empty value is refused
// (`openssl rand -hex 32` gives 64).
const cronEnvSchema = z.object({ CRON_SECRET: z.string().min(32) });

export function getCronSecret(): string {
  return parseEnv(cronEnvSchema, { CRON_SECRET: process.env.CRON_SECRET }).CRON_SECRET;
}

export type CanvasEnv = z.infer<typeof canvasEnvSchema>;

export function getCanvasEnv(): CanvasEnv {
  return parseEnv(canvasEnvSchema, {
    CANVAS_BASE_URL: process.env.CANVAS_BASE_URL,
    CANVAS_TOKEN: process.env.CANVAS_TOKEN,
  });
}

// The published Outlook calendar (the timetable). Anyone with this URL can read the calendar, so it
// is a secret like the others. It is optional: until it is set the timetable sync is skipped.
const timetableEnvSchema = z.object({ OUTLOOK_ICS_URL: z.url({ protocol: /^https$/ }).optional() });

/** The feed URL, or null when it isn't set. Throws (without the value) if it is set but not an https URL. */
export function getTimetableFeedUrl(): string | null {
  const raw = process.env.OUTLOOK_ICS_URL;
  return parseEnv(timetableEnvSchema, { OUTLOOK_ICS_URL: raw === "" ? undefined : raw }).OUTLOOK_ICS_URL ?? null;
}
