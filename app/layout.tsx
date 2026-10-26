import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "College Hub",
  description: "Degree planner and Canvas dashboard",
};

// Tints the browser chrome to match --background in each theme. Metadata cannot read CSS variables, so these mirror globals.css.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f4ef" },
    { media: "(prefers-color-scheme: dark)", color: "#100b08" },
  ],
};

// The system font (SF Pro on Apple devices) ships optical sizing and tuned tracking, so no web font is loaded.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
