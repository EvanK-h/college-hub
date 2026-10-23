import { z } from "zod";

type RawEnv = Record<string, string | undefined>;

/** Validates raw env values and throws one readable error naming each bad variable (never its value). */
export function parseEnv<S extends z.ZodType>(schema: S, raw: RawEnv): z.infer<S> {
  const result = schema.safeParse(raw);
  if (result.success) return result.data;

  const problems = result.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${raw[String(issue.path[0])] ? "invalid value" : "missing"}`)
    .join("\n");
  throw new Error(
    `Missing or invalid environment variables:\n${problems}\nCopy .env.example to .env.local and fill them in.`,
  );
}

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export function parsePublicEnv(raw: RawEnv): PublicEnv {
  return parseEnv(publicEnvSchema, raw);
}

export function getPublicEnv(): PublicEnv {
  // Each NEXT_PUBLIC_ variable must be written out literally so Next can inline it into the browser bundle.
  return parsePublicEnv({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}
