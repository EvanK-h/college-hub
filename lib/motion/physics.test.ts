import { describe, expect, it } from "vitest";
import { project, rubberband } from "./physics";

describe("project", () => {
  it("throws a flick forward in proportion to its speed", () => {
    // 1000 px/s at 0.998 a millisecond comes to rest 499 px on.
    expect(project(1000)).toBeCloseTo(499);
    expect(project(-1000)).toBeCloseTo(-499);
    expect(project(0)).toBe(0);
  });

  it("stops sooner with a stronger deceleration", () => {
    expect(Math.abs(project(1000, 0.99))).toBeLessThan(Math.abs(project(1000)));
  });
});

describe("rubberband", () => {
  it("follows slowly past the edge, and less the further it goes", () => {
    const small = rubberband(50, 400);
    const large = rubberband(500, 400);
    expect(small).toBeGreaterThan(0);
    expect(small).toBeLessThan(50);
    expect(large / 500).toBeLessThan(small / 50);
  });

  it("never reaches the box's own size", () => {
    expect(rubberband(100_000, 400)).toBeLessThan(400);
  });

  it("keeps the direction, and is zero at the edge", () => {
    expect(rubberband(-50, 400)).toBeCloseTo(-rubberband(50, 400));
    expect(rubberband(0, 400)).toBe(0);
  });
});
