import { describe, expect, it } from "vitest";
import { isPublicPath, redirectTarget } from "./paths";

describe("isPublicPath", () => {
  it("allows the login page and the auth routes", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/auth/callback")).toBe(true);
  });

  it("treats everything else as private", () => {
    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/pathway")).toBe(false);
    expect(isPublicPath("/login/extra")).toBe(false);
    expect(isPublicPath("/authority")).toBe(false);
  });
});

describe("redirectTarget", () => {
  it("sends signed-out visitors on private pages to the login page", () => {
    expect(redirectTarget("/", false)).toBe("/login");
    expect(redirectTarget("/courses/CS3000", false)).toBe("/login");
  });

  it("lets signed-out visitors reach the login page and the callback", () => {
    expect(redirectTarget("/login", false)).toBeNull();
    expect(redirectTarget("/auth/callback", false)).toBeNull();
  });

  it("sends a signed-in user away from the login page", () => {
    expect(redirectTarget("/login", true)).toBe("/");
  });

  it("lets a signed-in user through everywhere else, including the callback", () => {
    expect(redirectTarget("/", true)).toBeNull();
    expect(redirectTarget("/pathway", true)).toBeNull();
    expect(redirectTarget("/auth/callback", true)).toBeNull();
  });
});
