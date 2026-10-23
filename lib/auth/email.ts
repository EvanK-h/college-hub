import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
});

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isAllowedEmail(email: string, allowed: string): boolean {
  return normalizeEmail(email) === normalizeEmail(allowed);
}
