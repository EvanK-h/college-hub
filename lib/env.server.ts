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

export type CanvasEnv = z.infer<typeof canvasEnvSchema>;

export function getCanvasEnv(): CanvasEnv {
  return parseEnv(canvasEnvSchema, {
    CANVAS_BASE_URL: process.env.CANVAS_BASE_URL,
    CANVAS_TOKEN: process.env.CANVAS_TOKEN,
  });
}
