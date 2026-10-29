// Colour maths for checking the design tokens: OKLCH to sRGB, WCAG contrast and OKLab distance.
// The formulas are Björn Ottosson's OKLab matrices and WCAG 2's relative luminance.

export type Oklch = { l: number; c: number; h: number; alpha: number };
type Rgb = [number, number, number];

/** Parses `oklch(0.43 0.12 38)` or `oklch(0.255 0.028 55 / 0.1)`. */
export function parseOklch(value: string): Oklch {
  const match = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+)\s*)?\)$/.exec(value.trim());
  if (!match) throw new Error(`Not an oklch() colour: ${value}`);
  const [, l, c, h, alpha] = match;
  return { l: Number(l), c: Number(c), h: Number(h), alpha: alpha === undefined ? 1 : Number(alpha) };
}

function toOklab({ l, c, h }: Oklch): Rgb {
  const radians = (h * Math.PI) / 180;
  return [l, c * Math.cos(radians), c * Math.sin(radians)];
}

function toLinearSrgb(colour: Oklch): Rgb {
  const [l, a, b] = toOklab(colour);
  const lms = [l + 0.3963377774 * a + 0.2158037573 * b, l - 0.1055613458 * a - 0.0638541728 * b, l - 0.0894841775 * a - 1.291485548 * b].map(
    (value) => value ** 3,
  ) as Rgb;
  return [
    4.0767416621 * lms[0] - 3.3077115913 * lms[1] + 0.2309699292 * lms[2],
    -1.2684380046 * lms[0] + 2.6097574011 * lms[1] - 0.3413193965 * lms[2],
    -0.0041960863 * lms[0] - 0.7034186147 * lms[1] + 1.707614701 * lms[2],
  ];
}

/**
 * Whether an sRGB screen can show the colour as written. Wide-gamut (P3) screens show more, but an
 * sRGB screen clips anything outside, so the measured contrast and distances would not hold there.
 */
export function inSrgbGamut(colour: Oklch): boolean {
  return toLinearSrgb(colour).every((value) => value >= -0.0005 && value <= 1.0005);
}

/** Gamma-encoded sRGB in 0–1, clipped to the gamut the way a browser shows an out-of-gamut colour. */
export function toSrgb(colour: Oklch): Rgb {
  return toLinearSrgb(colour).map((value) => {
    const clipped = Math.min(1, Math.max(0, value));
    return clipped <= 0.0031308 ? 12.92 * clipped : 1.055 * clipped ** (1 / 2.4) - 0.055;
  }) as Rgb;
}

/** `#f7f4ef`, for places that can't read CSS variables (the theme-color metas). */
export function toHex(colour: Oklch): string {
  return `#${toSrgb(colour)
    .map((value) => Math.round(value * 255).toString(16).padStart(2, "0"))
    .join("")}`;
}

/** A translucent colour composited over an opaque one, as the browser blends them (in sRGB). */
export function over(top: Oklch, bottom: Rgb): Rgb {
  const colour = toSrgb(top);
  return colour.map((value, index) => value * top.alpha + (bottom[index] ?? 0) * (1 - top.alpha)) as Rgb;
}

function luminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)) as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two opaque sRGB colours (1–21). */
export function contrast(a: Rgb, b: Rgb): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

/** Distance in OKLab, ×100 (so 1 is about a just-noticeable difference). Alpha is ignored. */
export function deltaE(a: Oklch, b: Oklch): number {
  const [l1, a1, b1] = toOklab(a);
  const [l2, a2, b2] = toOklab(b);
  return 100 * Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}
