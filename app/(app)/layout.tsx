import { Suspense, ViewTransition } from "react";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { CommandPalette } from "@/components/command-palette";
import { MainNav, SettingsLink, TabBar } from "@/components/main-nav";
import { Toaster } from "@/components/toast";

// Shared shell for every signed-in page. The proxy and each page already guard access.
// The header is a translucent layer: pages scroll underneath it instead of below a solid strip.
// On a phone the places move to a tab bar at the bottom (TabBar), and the header keeps the name,
// search and settings. The tab bar sits outside the header: the header's backdrop-filter would
// make it the containing block for anything fixed inside it. Toasts (with Undo) are available
// to every page.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Toaster>
      <header className="material-bar scroll-edge sticky top-0 z-40">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-3 px-4 sm:gap-6 sm:px-6">
          <Link href="/" className="press flex shrink-0 items-center gap-2 rounded-lg font-semibold tracking-tight">
            <span className="flex size-8 items-center justify-center rounded-[0.6rem] bg-brand text-brand-foreground shadow-card">
              <GraduationCap aria-hidden className="size-[1.125rem]" />
            </span>
            {/* On a phone it gives way to the page's title as that scrolls under the header. */}
            <span className="max-sm:collapsed-title-swap">College Hub</span>
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
      {/* Page changes animate by the kind of link that caused them (globals.css): tabs cross-fade,
          going a level down pushes in from the right, a back link pushes the other way. Anything
          else, such as a Server Action refreshing the page, doesn't animate. */}
      <ViewTransition default="none" update={{ "nav-tab": "nav-tab", "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}>
        {children}
      </ViewTransition>
      <Suspense fallback={null}>
        <TabBar />
      </Suspense>
    </Toaster>
  );
}
