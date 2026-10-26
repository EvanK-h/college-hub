import { describe, expect, it } from "vitest";
import { isCronAuthorized } from "./cron";

const secret = "a-made-up-secret-that-is-long-enough-0123456789";

describe("isCronAuthorized", () => {
  it("accepts the right bearer token", () => {
    expect(isCronAuthorized(`Bearer ${secret}`, secret)).toBe(true);
  });

  it("rejects a wrong token, including one of a different length", () => {
    expect(isCronAuthorized("Bearer not-the-secret", secret)).toBe(false);
    expect(isCronAuthorized(`Bearer ${secret}x`, secret)).toBe(false);
    expect(isCronAuthorized(`Bearer ${secret.slice(0, -1)}`, secret)).toBe(false);
  });

  it("rejects a missing header or the wrong scheme", () => {
    expect(isCronAuthorized(null, secret)).toBe(false);
    expect(isCronAuthorized(secret, secret)).toBe(false);
    expect(isCronAuthorized(`Basic ${secret}`, secret)).toBe(false);
    expect(isCronAuthorized("Bearer ", secret)).toBe(false);
  });

  it("authorizes nothing when no secret is configured", () => {
    expect(isCronAuthorized("Bearer ", undefined)).toBe(false);
    expect(isCronAuthorized("Bearer ", "")).toBe(false);
    expect(isCronAuthorized("Bearer anything", undefined)).toBe(false);
    expect(isCronAuthorized("Bearer anything", "")).toBe(false);
  });
});
