// The light/dark choice. "system" follows the device; "light" and "dark" put that class on <html>,
// which globals.css honours (see the `dark` custom variant and the :root.light / :root.dark rules).
// It is a per-device preference, so it lives in localStorage rather than the database.

export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_STORAGE_KEY = "theme";

export function parseTheme(value: string | null | undefined): Theme {
  return THEMES.find((theme) => theme === value) ?? "system";
}

/**
 * Runs in <head> before the page paints, so a saved choice never flashes the other theme first.
 * Plain ES5 in a string: it runs before any bundle loads.
 */
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark")document.documentElement.classList.add(t)}catch(e){}`;
