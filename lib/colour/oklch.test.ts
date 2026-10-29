import { describe, expect, it } from "vitest";
import { contrast, deltaE, inSrgbGamut, over, parseOklch, toHex, toSrgb } from "./oklch";

describe("oklch maths", () => {
  it("converts to sRGB hex", () => {
    expect(toHex(parseOklch("oklch(1 0 0)"))).toBe("#ffffff");
    expect(toHex(parseOklch("oklch(0 0 0)"))).toBe("#000000");
    // CSS Color 4's reference value for sRGB red.
    expect(toHex(parseOklch("oklch(0.62796 0.25768 29.234)"))).toBe("#ff0000");
  });

  it("knows which colours an sRGB screen can show", () => {
    expect(inSrgbGamut(parseOklch("oklch(0.62796 0.25768 29.234)"))).toBe(true);
    expect(inSrgbGamut(parseOklch("oklch(0.7 0.3 145)"))).toBe(false);
  });

  it("reads alpha", () => {
    expect(parseOklch("oklch(0.255 0.028 55 / 0.1)").alpha).toBe(0.1);
    expect(() => parseOklch("#fff")).toThrow();
  });

  it("gives WCAG contrast", () => {
    const white = toSrgb(parseOklch("oklch(1 0 0)"));
    const black = toSrgb(parseOklch("oklch(0 0 0)"));
    expect(contrast(white, black)).toBeCloseTo(21);
    expect(contrast(black, white)).toBeCloseTo(21);
  });

  it("blends a translucent colour over a surface", () => {
    const halfBlack = over(parseOklch("oklch(0 0 0 / 0.5)"), toSrgb(parseOklch("oklch(1 0 0)")));
    expect(halfBlack.map((value) => value.toFixed(2))).toEqual(["0.50", "0.50", "0.50"]);
  });

  it("measures distance in OKLab ×100", () => {
    expect(deltaE(parseOklch("oklch(1 0 0)"), parseOklch("oklch(0 0 0)"))).toBeCloseTo(100);
    expect(deltaE(parseOklch("oklch(0.5 0.1 40)"), parseOklch("oklch(0.5 0.1 40 / 0.2)"))).toBe(0);
  });
});
