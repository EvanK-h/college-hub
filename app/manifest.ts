import type { MetadataRoute } from "next";
import { ICON_COLORS } from "@/lib/pwa/icons";

// Makes the site installable ("Add to Home Screen"). It opens full screen on the dashboard.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "College Hub",
    short_name: "College Hub",
    description: "Degree planner and Canvas dashboard",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: ICON_COLORS.background,
    theme_color: ICON_COLORS.background,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
