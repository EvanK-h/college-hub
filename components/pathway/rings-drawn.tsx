"use client";

import { useEffect } from "react";

// The rings draw in from empty (ARC_CLASS in progress-ring.tsx) the first time the page opens.
// Once they have, this marks the document, and the arcs' `in-data-rings-drawn:animate-none` skips
// the draw on later visits in the same session: redrawing on every visit starts to feel slow. A
// reload draws them once more.
const DRAW_MS = 900;

export function RingsDrawn() {
  useEffect(() => {
    const timer = setTimeout(() => {
      document.documentElement.dataset.ringsDrawn = "";
    }, DRAW_MS);
    return () => clearTimeout(timer);
  }, []);
  return null;
}
