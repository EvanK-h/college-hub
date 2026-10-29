import { parseOklch, type Oklch } from "./oklch";

export type Theme = "light" | "dark";
export type Tokens = Record<Theme, Map<string, Oklch>>;

/**
 * The colour tokens from the main `:root` block of globals.css, resolved for each theme:
 * `light-dark(a, b)` gives a and b, `var(--x)` follows x. Anything else (shadows, sizes) is skipped.
 */
export function readTokens(css: string): Tokens {
  const start = css.indexOf(":root {");
  const block = css.slice(start, css.indexOf("\n}", start));
  const raw = new Map<string, string>();
  for (const [, name, value] of block.matchAll(/--([\w-]+):\s*([^;]+);/g)) raw.set(name as string, (value as string).trim());

  const resolve = (name: string, theme: Theme, seen: string[] = []): Oklch | null => {
    const value = raw.get(name);
    if (!value || seen.includes(name)) return null;
    const pair = /^light-dark\((oklch\([^)]*\)),\s*(oklch\([^)]*\))\)$/.exec(value);
    if (pair) return parseOklch((theme === "light" ? pair[1] : pair[2]) as string);
    const reference = /^var\(--([\w-]+)\)$/.exec(value);
    return reference ? resolve(reference[1] as string, theme, [...seen, name]) : null;
  };

  const tokens: Tokens = { light: new Map(), dark: new Map() };
  for (const theme of ["light", "dark"] as const) {
    for (const name of raw.keys()) {
      const colour = resolve(name, theme);
      if (colour) tokens[theme].set(name, colour);
    }
  }
  return tokens;
}
