"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { courseTitleName } from "@/lib/courses/slug";
import { categoryClass } from "@/lib/setup/setup";
import { cn } from "@/lib/utils";

// The Courses card grows into the course page's header (a shared view transition on the title,
// `courseTitleName` in lib/courses/slug.ts). React only pairs the two when both are on screen in the same commit, but
// the course page streams in behind a skeleton. So the card leaves what the header shows (code,
// title, type, term) here as you open it, and the skeleton draws the real header from that at
// once; the full page then replaces it without moving. The real header clears it on mount, so a
// later visit by another route (⌘K, a link) never shows a stale course.

export type PendingCourse = { slug: string; code: string; title: string; color: number; typeName: string; termName: string };

let pending: PendingCourse | null = null;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** A Courses card's link: opening it leaves the course's header details for the skeleton. */
export function CourseCardLink({ href, course, className, children }: { href: string; course: PendingCourse; className?: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      transitionTypes={["nav-forward"]}
      className={className}
      onClick={() => {
        pending = course;
        listeners.forEach((listener) => listener());
      }}
    >
      {children}
    </Link>
  );
}

/** In the course page's skeleton: the real header if a card just opened it, otherwise `fallback`. */
export function PendingCourseHeader({ fallback }: { fallback: ReactNode }) {
  const course = useSyncExternalStore(
    subscribe,
    () => pending,
    () => null,
  );
  if (!course) return fallback;
  return (
    <PageHeader
      back={{ href: "/courses", label: "Courses" }}
      eyebrow={[course.code, course.typeName, course.termName].filter(Boolean).join(" · ")}
      title={course.title}
      shareName={courseTitleName(course.slug)}
      marker={<span aria-hidden className={cn("w-1.5 shrink-0 rounded-full bg-(--course)", categoryClass(course.color))} />}
    />
  );
}

/** On the loaded course page: the skeleton's copy has done its job. */
export function ClearPendingCourse() {
  useEffect(() => {
    pending = null;
  }, []);
  return null;
}
