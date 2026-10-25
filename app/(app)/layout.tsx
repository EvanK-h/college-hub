import { Suspense } from "react";
import { MainNav } from "@/components/main-nav";

// Shared shell for every signed-in page. The proxy and each page already guard access.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="border-b border-border bg-card px-4 py-2">
        <Suspense fallback={null}>
          <MainNav />
        </Suspense>
      </header>
      {children}
    </>
  );
}
