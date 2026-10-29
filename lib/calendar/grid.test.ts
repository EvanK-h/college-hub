import { describe, expect, it } from "vitest";
import { hourRange, layoutDay } from "./grid";

const at = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number) as [number, number];
  return hours * 60 + minutes;
};
const item = (id: string, start: string, end: string) => ({ item: id, start: at(start), end: at(end) });
const lanes = (placed: ReturnType<typeof layoutDay<string>>) => Object.fromEntries(placed.map((p) => [p.item, `${p.lane}/${p.lanes}`]));

describe("layoutDay", () => {
  it("gives classes that don't overlap the full width", () => {
    expect(lanes(layoutDay([item("a", "09:00", "10:40"), item("b", "11:00", "12:40")]))).toEqual({ a: "0/1", b: "0/1" });
  });

  it("treats back-to-back classes as not overlapping", () => {
    expect(lanes(layoutDay([item("a", "09:00", "10:00"), item("b", "10:00", "11:00")]))).toEqual({ a: "0/1", b: "0/1" });
  });

  it("puts a clash side by side", () => {
    expect(lanes(layoutDay([item("a", "09:00", "10:40"), item("b", "10:00", "11:00")]))).toEqual({ a: "0/2", b: "1/2" });
  });

  it("reuses a lane once it frees up, and shares the lane count across a chain", () => {
    // a overlaps b, b overlaps c, but a and c don't: c can take a's lane.
    const placed = lanes(layoutDay([item("a", "09:00", "10:00"), item("b", "09:30", "11:00"), item("c", "10:00", "10:30"), item("d", "13:00", "14:00")]));
    expect(placed).toEqual({ a: "0/2", b: "1/2", c: "0/2", d: "0/1" });
  });
});

describe("hourRange", () => {
  it("covers at least the usual day", () => {
    expect(hourRange([])).toEqual([9, 17]);
    expect(hourRange([{ start: at("10:00"), end: at("12:00") }])).toEqual([9, 17]);
  });

  it("widens to whole hours around early and late classes", () => {
    expect(hourRange([{ start: at("08:30"), end: at("10:00") }, { start: at("17:10"), end: at("18:50") }])).toEqual([8, 19]);
  });
});
