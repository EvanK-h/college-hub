// Placing a week's classes on a time grid. Times are minutes from midnight in the term's zone.

export type Timed<T> = { item: T; start: number; end: number };
export type Placed<T> = Timed<T> & { lane: number; lanes: number };

/**
 * Lays one day's items out in side-by-side lanes where they overlap, so a clash shows as two
 * narrow blocks rather than one hiding the other. Items that overlap, directly or through a
 * chain, form a group; each takes the first lane free at its start, and the group shares a lane
 * count so its blocks line up.
 */
export function layoutDay<T>(items: readonly Timed<T>[]): Placed<T>[] {
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end);
  const placed: Placed<T>[] = [];
  let group: Placed<T>[] = [];
  let laneEnds: number[] = [];
  let groupEnd = -Infinity;

  const close = () => {
    for (const item of group) item.lanes = laneEnds.length;
    group = [];
    laneEnds = [];
  };

  for (const item of sorted) {
    if (item.start >= groupEnd) close();
    let lane = laneEnds.findIndex((end) => end <= item.start);
    if (lane === -1) lane = laneEnds.push(item.end) - 1;
    else laneEnds[lane] = item.end;
    const next = { ...item, lane, lanes: 1 };
    group.push(next);
    placed.push(next);
    groupEnd = Math.max(groupEnd, item.end);
  }
  close();
  return placed;
}

/**
 * The hours the grid shows: from the earliest start to the latest end of the week's items,
 * widened to whole hours and to at least the usual working day, so an empty or quiet week still
 * reads as a day.
 */
export function hourRange(items: readonly { start: number; end: number }[], usual: [number, number] = [9, 17]): [number, number] {
  const first = Math.min(usual[0] * 60, ...items.map((item) => item.start));
  const last = Math.max(usual[1] * 60, ...items.map((item) => item.end));
  return [Math.max(0, Math.floor(first / 60)), Math.min(24, Math.ceil(last / 60))];
}
