import { Suspense } from "react";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { CommandPalette } from "@/components/command-palette";
import { MainNav } from "@/components/main-nav";

// Shared shell for every signed-in page. The proxy and each page already guard access.
// The header is a translucent layer: pages scroll underneath it instead of below a solid strip.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="material-bar scroll-edge sticky top-0 z-40">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-3 px-4 sm:gap-6 sm:px-6">
          <Link href="/" className="press flex shrink-0 items-center gap-2 rounded-lg font-semibold tracking-tight">
            <span className="flex size-8 items-center justify-center rounded-[0.6rem] bg-primary text-primary-foreground shadow-card">
              <GraduationCap aria-hidden className="size-[1.125rem]" />
            </span>
            <span className="hidden sm:inline">College Hub</span>
            <span className="sr-only sm:hidden">College Hub</span>
          </Link>
          {/* min-w-0 lets the nav scroll sideways instead of pushing search off the screen. */}
          <div className="min-w-0 flex-1">
            <Suspense fallback={null}>
              <MainNav />
            </Suspense>
          </div>
          <CommandPalette />
        </div>
      </header>
      {children}
    </>
  );
}
