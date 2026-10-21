# Decision log

## 2026-10-21: UI components and colour palette

**Decision.** Use shadcn/ui (`base-nova` style, Base UI primitives) with a warm palette defined as CSS variables in `app/globals.css`. Light and dark themes both come from five source colours: Golden Batter `#E8D1A7`, Olive Harvest `#9D9167`, Toasted Caramel `#84592B`, Spiced Wine `#743014` and Cowhide Cocoa `#442D1C`.

**Mapping.**
- Light: cream background (lightened Golden Batter), Cowhide Cocoa text, Spiced Wine primary, Golden Batter accent, olive greens for secondary and finished states, Toasted Caramel for due-soon and the focus ring.
- Dark: deep cocoa surfaces, Golden Batter as the primary (variant "A"; a lighter caramel primary was the rejected alternative).

**Why.**
- Colours are oklch tokens, so lightness can be tuned for contrast without changing hue.
- Every text pair meets WCAG 4.5:1, and rings, input borders and the progress fill meet 3:1.
- "Finished" is a filled green pill and "not submitted" is an outline-only neutral pill, so the two states never read alike.
- Added `success` and `warning` tokens beyond shadcn's defaults to carry those states. Overdue and destructive use a clearer red, because Spiced Wine is too close to the primary to signal danger.

**Rejected.** Terracotta and honey primaries, and green-tinted or espresso/ink dark backgrounds from earlier trials.

**Notes.**
- shadcn's generated `lib/utils.ts` re-exports `cn` from the `cn` npm package (published by shadcn-ui) instead of `clsx` + `tailwind-merge`. Checked and kept.
- Dark mode is class-based (`.dark`). A theme toggle is not built yet.
