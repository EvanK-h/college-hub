import "server-only";
import { createHash, randomBytes } from "node:crypto";

/**
 * A new feed token and the hash stored in its place. 32 random bytes as base64url is 43
 * characters, the shape calendar_feed() accepts. The hash matches the SQL side:
 * encode(sha256(convert_to(token, 'UTF8')), 'hex').
 */
export function generateFeedToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashFeedToken(token) };
}

export function hashFeedToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
