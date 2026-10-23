import { describe, expect, it } from "vitest";
import { parsePublicEnv } from "./env";

const valid = {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "example-anon-key",
};

describe("parsePublicEnv", () => {
  it("returns the values when both variables are valid", () => {
    expect(parsePublicEnv(valid)).toEqual(valid);
  });

  it("names every missing variable and points to .env.example", () => {
    expect(() => parsePublicEnv({})).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL: missing[\s\S]*NEXT_PUBLIC_SUPABASE_ANON_KEY: missing[\s\S]*\.env\.example/,
    );
  });

  it("flags a malformed URL as invalid", () => {
    expect(() => parsePublicEnv({ ...valid, NEXT_PUBLIC_SUPABASE_URL: "not a url" })).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL: invalid value/,
    );
  });

  it("treats an empty key as missing", () => {
    expect(() => parsePublicEnv({ ...valid, NEXT_PUBLIC_SUPABASE_ANON_KEY: "" })).toThrow(
      /NEXT_PUBLIC_SUPABASE_ANON_KEY: missing/,
    );
  });

  it("never includes a variable's value in the error message", () => {
    const secret = "super-secret-value-123";
    try {
      parsePublicEnv({ NEXT_PUBLIC_SUPABASE_URL: secret, NEXT_PUBLIC_SUPABASE_ANON_KEY: "" });
      expect.unreachable();
    } catch (error) {
      expect((error as Error).message).not.toContain(secret);
    }
  });
});
