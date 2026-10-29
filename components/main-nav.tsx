"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, Route, Settings, Sun } from "lucide-react";
import { SegmentedLinks, SegmentedNav } from "@/components/segmented-nav";
import { activeHref } from "@/lib/navigation/active";
import { cn } from "@/lib/utils";

// The app's four places (see the 2026-10-29 navigation decision). Plan's own pages (requirements,
// swaps, prerequisites, what-if plans) sit under /pathway and have their own control, `PlanNav`.
// Settings is a utility, so it is a gear button rather than a fifth place.
const SECTIONS = [
  { href: "/", label: "Today", Icon: Sun },
  { href: "/calendar", label: "Calendar", Icon: CalendarDays },
  { href: "/courses", label: "Courses", Icon: BookOpen },
  { href: "/pathway", label: "Plan", Icon: Route },
] as const;
const HREFS = SECTIONS.map((section) => section.href);

/** The places as a segmented control in the header, from small-tablet width up. */
export function MainNav() {
  return <SegmentedNav links={SECTIONS} label="Main" layoutId="main-nav-pill" className="hidden sm:block" />;
}

// The nav reads the path, so the layout renders it inside Suspense. These placeholders are the
// same controls with nothing selected, so the header and tab bar never pop in on a first load.
export function MainNavFallback() {
  return <SegmentedLinks links={SECTIONS} label="Main" layoutId="main-nav-pill" className="hidden sm:block" current={null} />;
}
export function TabBarFallback() {
  return <TabBarLinks current={null} />;
}
export function SettingsLinkFallback() {
  return <SettingsLinkView active={false} />;
}

/**
 * The places as a tab bar along the bottom on a phone, where the thumb is. A translucent layer,
 * like the header, that clears the home indicator. The current place takes the tint: a tab is
 * something you act on, and Apple's tab bars mark the selected one that way.
 */
export function TabBar() {
  return <TabBarLinks current={activeHref(usePathname(), HREFS)} />;
}

function TabBarLinks({ current }: { current: string | null }) {
  return (
    <nav
      aria-label="Main"
      className="material-bar fixed inset-x-0 bottom-0 z-40 border-t border-separator pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {SECTIONS.map(({ href, label, Icon }) => {
          const active = current === href;
          return (
            <li key={href}>
              <Link
                href={href}
                transitionTypes={["nav-tab"]}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "press flex h-14 flex-col items-center justify-center gap-0.5 text-[0.6875rem] font-medium focus-visible:outline-offset-[-4px]",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon aria-hidden className="size-6" strokeWidth={active ? 2.25 : 1.75} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** The gear at the end of the header. It reads as pressed while you're on Settings. */
export function SettingsLink() {
  return <SettingsLinkView active={usePathname().startsWith("/settings")} />;
}

function SettingsLinkView({ active }: { active: boolean }) {
  return (
    <Link
      href="/settings"
      transitionTypes={["nav-tab"]}
      aria-label="Settings"
      aria-current={active ? "page" : undefined}
      className={cn(
        "press flex size-8 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-ring",
        active ? "bg-card text-foreground shadow-card" : "bg-fill-secondary text-muted-foreground hover:text-foreground",
      )}
    >
      <Settings aria-hidden className="size-[1.125rem]" />
    </Link>
  );
}
