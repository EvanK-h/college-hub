import { Suspense } from "react";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { CommandPalette } from "@/components/command-palette";
import { MainNav, SettingsLink, TabBar } from "@/components/main-nav";

// Shared shell for every signed-in page. The proxy and each page already guard access.
// The header is a translucent layer: pages scroll underneath it instead of below a solid strip.
// On a phone the places move to a tab bar at the bottom (TabBar), and the header keeps the name,
// search and settings. The tab bar sits outside the header: the header's backdrop-filter would
// make it the containing block for anything fixed inside it.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="material-bar scroll-edge sticky top-0 z-40">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-3 px-4 sm:gap-6 sm:px-6">
          <Link href="/" className="press flex shrink-0 items-center gap-2 rounded-lg font-semibold tracking-tight">
            <span className="flex size-8 items-center justify-center rounded-[0.6rem] bg-primary text-primary-foreground shadow-card">
              <GraduationCap aria-hidden className="size-[1.125rem]" />
            </span>
            College Hub
          </Link>
          {/* min-w-0 lets the nav scroll sideways rather than push search off a narrow screen. */}
          <div className="min-w-0 flex-1">
            <Suspense fallback={null}>
              <MainNav />
            </Suspense>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <CommandPalette />
            <Suspense fallback={null}>
              <SettingsLink />
            </Suspense>
          </div>
        </div>
      </header>
      {children}
      <Suspense fallback={null}>
        <TabBar />
      </Suspense>
    </>
  );
}
