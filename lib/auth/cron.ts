import { createHash, timingSafeEqual } from "node:crypto";

// Hashing both sides first gives timingSafeEqual two buffers of equal length (it throws otherwise)
// and means the comparison time reveals nothing about the secret's length or content.
const digest = (value: string) => createHash("sha256").update(value).digest();

/**
 * True when the Authorization header is `Bearer <secret>`. Fails closed: with no secret
 * configured, or no header, nothing is authorized.
 */
export function isCronAuthorized(authorization: string | null, secret: string | undefined): boolean {
  if (!secret || !authorization) return false;
  const token = authorization.match(/^Bearer (.+)$/)?.[1];
  if (!token) return false;
  return timingSafeEqual(digest(token), digest(secret));
}
