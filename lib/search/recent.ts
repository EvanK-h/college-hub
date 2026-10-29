import { z } from "zod";

// The pages you opened most recently, newest first, for ⌘K with nothing typed. Kept in the
// browser's localStorage, so it is read back through a schema like any other untrusted input.

export type RecentPage = { href: string; label: string };

export const RECENT_STORAGE_KEY = "college-hub:recent-pages";
export const MAX_RECENT = 5;

const recentSchema = z.array(z.object({ href: z.string().startsWith("/"), label: z.string().min(1).max(100) })).max(MAX_RECENT);

/** The stored list, or an empty one if it is missing or isn't one we wrote. */
export function parseRecent(stored: string | null): RecentPage[] {
  if (!stored) return [];
  try {
    const parsed = recentSchema.safeParse(JSON.parse(stored));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

/** `page` moved to the front, without duplicates, keeping at most MAX_RECENT. */
export function rememberPage(list: RecentPage[], page: RecentPage): RecentPage[] {
  return [page, ...list.filter((item) => item.href !== page.href)].slice(0, MAX_RECENT);
}
