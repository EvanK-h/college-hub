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
