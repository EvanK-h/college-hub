"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MotionConfig, motion } from "motion/react";
import { activeHref } from "@/lib/navigation/active";
import { cn } from "@/lib/utils";

// Critically damped (no overshoot): the pill is moved by a click, not thrown, so it should settle, not bounce.
const PILL_SPRING = { type: "spring", bounce: 0, duration: 0.35 } as const;

/**
 * A row of links drawn as a segmented control, for switching between sibling pages. The current
 * page is the longest link that is the path or a parent of it, and its pill glides from the last
 * one on a spring. `layoutId` must be unique per control on a page, so two controls' pills don't
 * fly between each other.
 */
export function SegmentedNav({
  links,
  label,
  layoutId,
  className,
}: {
  links: readonly { href: string; label: string }[];
  label: string;
  layoutId: string;
  className?: string;
}) {
  const current = activeHref(
    usePathname(),
    links.map((link) => link.href),
  );
  return <SegmentedLinks links={links} label={label} layoutId={layoutId} className={className} current={current} />;
}

/**
 * The control itself, for a given current link. With `current` null it is the placeholder shown
 * while the path is read (inside Suspense), the same size and links, just with nothing selected.
 */
export function SegmentedLinks({
  links,
  label,
  layoutId,
  className,
  current,
}: {
  links: readonly { href: string; label: string }[];
  label: string;
  layoutId: string;
  className?: string;
  current: string | null;
}) {
  return (
    // "user" swaps the spring for an instant change when the OS asks for reduced motion.
    <MotionConfig reducedMotion="user">
      <nav aria-label={label} className={cn("-mx-1 overflow-x-auto px-1 [scrollbar-width:none]", className)}>
        <ul className="flex w-max gap-0.5 rounded-full bg-fill-secondary p-1">
          {links.map(({ href, label: text }) => {
            const active = current === href;
            return (
              <li key={href} className="relative">
                {active && (
                  <motion.span
                    layoutId={layoutId}
                    transition={PILL_SPRING}
                    className="absolute inset-0 rounded-full bg-card shadow-card"
                    aria-hidden
                  />
                )}
                <Link
                  href={href}
                  transitionTypes={["nav-tab"]}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "press relative block rounded-full px-3 py-1.5 text-sm font-medium focus-visible:outline-offset-0 sm:px-3.5",
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {text}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </MotionConfig>
  );
}
