import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CHROME_COLOURS } from "@/lib/theme";
import { contrast, deltaE, inSrgbGamut, toHex, toSrgb, type Oklch } from "./oklch";
import { readTokens, type Theme } from "./tokens";

// The colour rules from the spec's Visual design section, checked against app/globals.css in both
// themes. A new or changed colour has to pass these before it lands.

const tokens = readTokens(readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8"));
const THEMES: Theme[] = ["light", "dark"];
const STATUSES = ["status-planned", "status-in-progress", "status-done", "status-due-soon", "status-overdue"];
const CATEGORIES = [1, 2, 3, 4, 5, 6].map((n) => `category-${n}`);

function get(theme: Theme, name: string): Oklch {
  const colour = tokens[theme].get(name);
  if (!colour) throw new Error(`No --${name} in the ${theme} theme`);
  return colour;
}
const ratio = (theme: Theme, text: string, surface: string) => contrast(toSrgb(get(theme, text)), toSrgb(get(theme, surface)));
// Greys: planned, and the two neutral course types (General elective, Co-op / program).
const neutral = (theme: Theme, name: string) => get(theme, name).c < 0.03;

describe.each(THEMES)("%s theme", (theme) => {
  // Otherwise an sRGB screen clips it, and the numbers below would describe a colour nobody sees.
  it("keeps every colour inside sRGB", () => {
    for (const [name, colour] of tokens[theme]) expect(inSrgbGamut(colour), name).toBe(true);
  });

  it.each([
    ["foreground", ["background", "card", "popover"]],
    ["muted-foreground", ["background", "card", "popover"]],
    ["tertiary-foreground", ["background", "card", "popover"]],
    ["primary", ["background", "card", "popover"]],
    ["destructive", ["card", "popover"]],
    ["primary-foreground", ["primary"]],
    ...STATUSES.map((status) => [status, ["card"]] as const),
  ] as const)("%s text passes 4.5:1", (text, surfaces) => {
    for (const surface of surfaces) expect(ratio(theme, text, surface), `${text} on ${surface}`).toBeGreaterThanOrEqual(4.5);
  });

  it.each(CATEGORIES)("%s passes 3:1 on cards, as a graphic", (category) => {
    expect(ratio(theme, category, "card")).toBeGreaterThanOrEqual(3);
  });

  // A course's type and its status must never read as one signal. The neutral types share
  // planned's grey on purpose: planned is the absence of a status colour, not a hue.
  it("keeps every course type at least 10 ΔE from every status hue", () => {
    for (const category of CATEGORIES) {
      for (const status of STATUSES) {
        if (neutral(theme, category) && neutral(theme, status)) continue;
        expect(deltaE(get(theme, category), get(theme, status)), `${category} / ${status}`).toBeGreaterThanOrEqual(10);
      }
    }
  });

  it("keeps the course types at least 10 ΔE apart", () => {
    for (const [index, a] of CATEGORIES.entries()) {
      for (const b of CATEGORIES.slice(index + 1)) expect(deltaE(get(theme, a), get(theme, b)), `${a} / ${b}`).toBeGreaterThanOrEqual(10);
    }
  });

  it("keeps the tint at least 10 ΔE from every status and course type, so actions never read as either", () => {
    for (const name of [...STATUSES, ...CATEGORIES]) expect(deltaE(get(theme, "primary"), get(theme, name)), name).toBeGreaterThanOrEqual(10);
  });

  it("separates cards from the page by value, not only by shadow", () => {
    expect(deltaE(get(theme, "card"), get(theme, "background"))).toBeGreaterThanOrEqual(3.5);
  });

  it("mirrors --background in CHROME_COLOURS", () => {
    expect(CHROME_COLOURS[theme]).toBe(toHex(get(theme, "background")));
  });
});
