"use client";

import { useEffect } from "react";

// A link to /courses/cs-1800#announcement-<id> (from Today or search) opens that announcement:
// each one is a closed <details>, which the browser won't open for a hash on its own.
export function OpenAnnouncementFromHash() {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id.startsWith("announcement-")) return;
    const item = document.getElementById(id);
    const details = item?.querySelector("details");
    if (!item || !details) return;
    details.open = true;
    item.scrollIntoView({ block: "center" });
    details.querySelector("summary")?.focus({ preventScroll: true });
  }, []);
  return null;
}
