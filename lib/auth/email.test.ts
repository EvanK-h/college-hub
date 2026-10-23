import { describe, expect, it } from "vitest";
import { isAllowedEmail, loginSchema, normalizeEmail } from "./email";

describe("normalizeEmail", () => {
  it("trims whitespace and lowercases", () => {
    expect(normalizeEmail("  Evan@Example.COM ")).toBe("evan@example.com");
  });
});

describe("isAllowedEmail", () => {
  it("accepts the allowed address regardless of case or padding", () => {
    expect(isAllowedEmail(" EVAN@example.com", "evan@example.com")).toBe(true);
  });

  it("rejects any other address", () => {
    expect(isAllowedEmail("someone@example.com", "evan@example.com")).toBe(false);
  });

  it("rejects a look-alike that only contains the allowed address", () => {
    expect(isAllowedEmail("evan@example.com.evil.test", "evan@example.com")).toBe(false);
  });
});

describe("loginSchema", () => {
  it("normalises a valid email", () => {
    expect(loginSchema.parse({ email: "  Evan@Example.com " })).toEqual({ email: "evan@example.com" });
  });

  it("rejects text that is not an email", () => {
    expect(loginSchema.safeParse({ email: "not an email" }).success).toBe(false);
  });

  it("rejects a missing email", () => {
    expect(loginSchema.safeParse({}).success).toBe(false);
  });
});
