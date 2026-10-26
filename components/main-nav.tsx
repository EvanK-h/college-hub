"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MotionConfig, motion } from "motion/react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/pathway", label: "Pathway" },
  { href: "/pathway/requirements", label: "Requirements" },
  { href: "/pathway/swaps", label: "Swaps" },
] as const;

// Critically damped (no overshoot): the pill is moved by a click, not thrown, so it should settle, not bounce.
const PILL_SPRING = { type: "spring", bounce: 0, duration: 0.35 } as const;

// Client component because it reads the current path and animates the active pill between links.
export function MainNav() {
  const pathname = usePathname();

  return (
    // "user" swaps the spring for an instant change when the OS asks for reduced motion.
    <MotionConfig reducedMotion="user">
      <nav aria-label="Main" className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none]">
        <ul className="flex w-max gap-0.5 rounded-full bg-fill-secondary p-1">
          {LINKS.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <li key={href} className="relative">
                {active && (
                  <motion.span
                    layoutId="main-nav-pill"
                    transition={PILL_SPRING}
                    className="absolute inset-0 rounded-full bg-card shadow-card"
                    aria-hidden
                  />
                )}
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "press relative block rounded-full px-3 py-1.5 text-sm font-medium focus-visible:outline-offset-0 sm:px-3.5",
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </MotionConfig>
  );
}
