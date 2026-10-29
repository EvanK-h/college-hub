"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export type CalendarKeyLinks = { previous: string; next: string; today: string; month: string; week: string };

// The calendar's shortcuts: ← and → for the previous and next week or month, T for today, M and W
// for the view. They're skipped while you type in a field, hold a modifier (so ⌘← stays the
// browser's), or have a dialog such as ⌘K open. The buttons name them in their tooltips.
export function CalendarKeys({ links }: { links: CalendarKeyLinks }) {
  const router = useRouter();

  useEffect(() => {
    const keys: Record<string, string> = { ArrowLeft: links.previous, ArrowRight: links.next, t: links.today, m: links.month, w: links.week };
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || event.defaultPrevented) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || target.closest("input, textarea, select, [role=dialog]"))) return;
      const href = keys[event.key.length === 1 ? event.key.toLowerCase() : event.key];
      if (!href) return;
      event.preventDefault();
      router.push(href, { scroll: false });
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [links, router]);

  return null;
}
