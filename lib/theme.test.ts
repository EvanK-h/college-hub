import { describe, expect, it } from "vitest";
import { parseTheme, THEME_SCRIPT } from "./theme";

describe("parseTheme", () => {
  it("keeps a known theme and falls back to the system", () => {
    expect(parseTheme("dark")).toBe("dark");
    expect(parseTheme("light")).toBe("light");
    expect(parseTheme(null)).toBe("system");
    expect(parseTheme("sepia")).toBe("system");
  });
});

describe("THEME_SCRIPT", () => {
  it("applies a saved choice to <html>, and survives storage being unavailable", () => {
    const classes = new Set<string>();
    const run = (storage: { getItem: (key: string) => string | null }) =>
      new Function("localStorage", "document", THEME_SCRIPT)(storage, { documentElement: { classList: { add: (c: string) => classes.add(c) } } });

    run({ getItem: () => "dark" });
    expect(classes).toEqual(new Set(["dark"]));
    expect(() =>
      run({
        getItem: () => {
          throw new Error("blocked");
        },
      }),
    ).not.toThrow();
  });
});
