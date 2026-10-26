import type { ReactNode } from "react";

// The large title every page opens with. `children` sits under it for legends or summaries.
export function PageHeader({
  title,
  eyebrow,
  description,
  children,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-2">
      {eyebrow && <p className="text-xs font-semibold tracking-wide text-primary uppercase">{eyebrow}</p>}
      <h1 className="text-large-title">{title}</h1>
      {description && <p className="max-w-prose text-base text-muted-foreground">{description}</p>}
      {children}
    </header>
  );
}

// Keeps every page on the same column width and rhythm under the header.
export const PAGE_CLASS = "mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 pt-8 pb-16 sm:px-6 sm:pt-10";
