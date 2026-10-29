// Apple's gesture physics (from "Designing Fluid Interfaces", WWDC 2018), as pure functions.

/** Per-millisecond deceleration of a normal scroll view. */
export const DECELERATION = 0.998;

/**
 * Where a flick comes to rest: the distance a scroll view decelerating at `rate` per millisecond
 * covers from `velocity` px/s. Exponential decay, not the textbook v²/2a.
 */
export function project(velocity: number, rate = DECELERATION): number {
  return ((velocity / 1000) * rate) / (1 - rate);
}

/**
 * How far content follows a drag that's `overshoot` px past its edge, in a box `dimension` px
 * wide: 1:1 at first, then less and less, never reaching `dimension`. Soft resistance reads as
 * "nothing more here" without the hard stop that reads as frozen.
 */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  if (dimension <= 0) return 0;
  return Math.sign(overshoot) * ((Math.abs(overshoot) * dimension * constant) / (dimension + constant * Math.abs(overshoot)));
}
