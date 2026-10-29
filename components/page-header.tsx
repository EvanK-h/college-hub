import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

// The large title every page opens with. `back` links up from a page that is one level down
// (a course, a what-if plan), so there is always a way out besides the browser's back button.
// `nav` sits right under the title, for a section's own pages; `children` sits under the
// description, for legends or summaries. `eyebrow` is for context the title doesn't give (a
// course's code and term), not for repeating the section's name. `marker` sits beside the title,
// such as a course's type bar.
export function PageHeader({
  title,
  eyebrow,
  description,
  back,
  nav,
  marker,
  children,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  back?: { href: string; label: string };
  nav?: ReactNode;
  marker?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-2">
      {back && (
        <Link
          href={back.href}
          transitionTypes={["nav-back"]}
          className="press -ml-1 flex w-max items-center gap-0.5 rounded-lg pr-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          <ChevronLeft aria-hidden className="size-4" />
          {back.label}
        </Link>
      )}
      {eyebrow && <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{eyebrow}</p>}
      {marker ? (
        <div className="flex items-stretch gap-3">
          {marker}
          <LargeTitle>{title}</LargeTitle>
        </div>
      ) : (
        <LargeTitle>{title}</LargeTitle>
      )}
      {nav && <div className="mt-1">{nav}</div>}
      {description && <p className="max-w-prose text-base text-muted-foreground">{description}</p>}
      {children}
    </header>
  );
}

// A page's h1. On a phone, once it scrolls under the header, a small copy shows in the header's
// middle (`collapsed-title` in globals.css), so a long page still says where you are. The copy is
// fixed over the header, hidden from screen readers and clicks; the h1 is the real title.
export function LargeTitle({ children }: { children: string }) {
  return (
    <>
      <h1 className="text-large-title large-title-timeline">{children}</h1>
      <p
        aria-hidden
        className="collapsed-title pointer-events-none fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-center px-24 text-headline sm:hidden"
      >
        <span className="truncate">{children}</span>
      </p>
    </>
  );
}

// Keeps every page on the same column width and rhythm under the header. On a phone the bottom
// padding also clears the tab bar (3.5rem plus the home indicator's inset).
export const PAGE_CLASS =
  "mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 pt-8 pb-[calc(7.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:pt-10 sm:pb-16";
