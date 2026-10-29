"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { parseTheme, THEME_STORAGE_KEY, THEMES, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const LABELS: Record<Theme, string> = { system: "System", light: "Light", dark: "Dark" };
const ICONS = { system: Monitor, light: Sun, dark: Moon } satisfies Record<Theme, unknown>;

// Browser chrome colours, mirroring --background (see the viewport in app/layout.tsx).
const CHROME: Record<Exclude<Theme, "system">, string> = { light: "#f7f4ef", dark: "#100b08" };

// Subscribers re-read the choice when it changes in this tab or another one.
const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}
function read(): Theme {
  try {
    return parseTheme(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

function apply(theme: Theme) {
  try {
    if (theme === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage blocked (private mode): the choice still applies until the page reloads.
  }
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  if (theme !== "system") root.classList.add(theme);
  // The theme-color metas follow the system by media query; pin them when a theme is forced.
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    const media = meta.dataset.media ?? meta.media;
    meta.dataset.media = media;
    meta.media = theme === "system" ? media : "all";
    if (theme !== "system") meta.content = CHROME[theme];
    else meta.content = media.includes("dark") ? CHROME.dark : CHROME.light;
  }
  listeners.forEach((listener) => listener());
}

// System / Light / Dark, as a group of pressed buttons. On the server (and before hydration) it
// shows "System"; the inline script in app/layout.tsx has already applied any saved choice.
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, read, () => "system" as const);

  return (
    <div role="group" aria-label="Appearance" className="flex w-max gap-0.5 rounded-full bg-fill-secondary p-1">
      {THEMES.map((option) => {
        const Icon = ICONS[option];
        return (
          <button
            key={option}
            type="button"
            aria-pressed={theme === option}
            onClick={() => apply(option)}
            className={cn(
              "press flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring",
              theme === option ? "bg-card text-foreground shadow-card" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon aria-hidden className="size-3.5" />
            {LABELS[option]}
          </button>
        );
      })}
    </div>
  );
}
