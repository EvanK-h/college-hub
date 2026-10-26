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

## 2026-10-24: Single-user sign-in with magic links

**Decision.** Public sign-ups are off in Supabase (`[auth] enable_signup = false`), the email provider stays on (`[auth.email] enable_signup = true`), and the one user is created by hand in Studio. The login Server Action also checks the email against `ALLOWED_EMAIL`, and `shouldCreateUser: false` stops the OTP call from creating accounts.

**Why.**
- The database refuses new accounts even if the app check is bypassed, and the app check refuses other addresses even if a second user is ever created.
- The login form gives the same reply for allowed and disallowed addresses, so it never reveals which email may sign in.
- The proxy redirects signed-out visitors, and the home page re-checks the session as a second guard.

**Gotcha.** `[auth.email] enable_signup` switches the whole email provider off, despite its name. Setting it to `false` made every magic link fail with `email_provider_disabled`. Only the top-level `[auth]` switch blocks new accounts.

**Consequence.** `/api/sync/*` (bearer token) and the calendar feed (token in the URL) must be added to the proxy's public paths when those routes are built, with their own auth checks.

## 2026-10-24: Request-time data lives behind Suspense (Cache Components)

**Decision.** Keep `cacheComponents: true` from the scaffold. Any component that reads the session or `searchParams` sits inside a `<Suspense>` boundary, so the rest of the page prerenders as a static shell.

**Why.** With Cache Components, reading cookies or `searchParams` outside a boundary is a production build error that dev mode does not show. Always run `npm run build` after adding a page that reads request data.

## 2026-10-25: Pathway schema shape

**Decision.** The first migration adds the pathway tables as the spec describes, with these changes:
- `swap_options` is unique on `(owner_id, swap_in, slot)`, not on the course name, and the swap count is 32, not 31.
- `quantum_relevance` is a five-value enum declared worst to best: `none`, `lower`, `low`, `medium`, `high`.
- `course_requirements` and `swap_replaces` get an `owner_id` and their own RLS policy.

**Why.**
- Three courses (CS 4810, CY 4770, CS 4130) are swaps for two different slots, each with its own replaced courses and reasoning. They are separate options, so the Notion export has 32 rows.
- `lower` is a real level: INSH 1600 or PHIL 1115 in place of MATH 2341 loses prep for physics courses, which is worse than a neutral `low`. Enums sort by declaration order, so the swap explorer can sort by relevance in SQL.
- The "every table has `owner_id` and RLS" rule has no exceptions, join tables included.

**Notes.** `Fits in` stays free text because values like "Spring 2030 (PHYS 5352 slot only)" are not term references. The Notion exports are personal data and live in the gitignored `scripts/data/`.


## 2026-10-25: Requirements are unique per name

**Decision.** `requirements` is unique on `(owner_id, name)`, added in a new migration.

**Why.** The importer upserts requirements by name, and Postgres can only match an upsert against a unique constraint. Without one, every re-run would insert all 31 requirements again. The 31 names in the Notion export are distinct.

## 2026-10-25: Term dates are deferred

**Decision.** The terms seed sets names, kinds, campuses and time zones, but leaves `starts_on` and `ends_on` null.

**Why.** The pathway pages only need the term order (`id`), and the real calendars are not published for every term yet. Dates matter from Phase 2, when the timetable and sync need term boundaries, so they get filled in then.

## 2026-10-25: Pathway rings count courses; moves are not validated yet

**Decision.**
- The requirement-area rings on `/pathway/requirements` count courses by status, not requirements. A course linked to several requirements in the same area counts once. The NUpath ring counts the 13 codes, and a code is covered only when a completed course carries it.
- Editing a course's status and term from the pathway page accepts any move, including into a co-op term.

**Why.**
- Some requirements bundle a lecture and its lab (Discrete Structures). Counting requirements hid progress until both were done. The lists under the rings still show them bundled.
- Prerequisite, co-op and per-term SH checks belong with drag-and-drop planning in Phase 4.

**Note.** All 13 NUpath codes are treated as required. `REQUIRED_NUPATH` in `lib/pathway/nupath.ts` is the one place to change that.

## 2026-10-26: Apple-style visual redesign

**Decision.** Restyle the whole app along Apple's design guidance (WWDC *Designing Fluid Interfaces* and related talks) while keeping the warm palette from 2026-10-21, used with more restraint.

**What changed.**
- Surfaces are near-neutral (warm off-white / near-black cocoa) with white or raised cards on soft shadows instead of borders. Spiced Wine (light) and Golden Batter (dark) stay the only accent.
- Tokens use CSS `light-dark()`, so one block covers both themes. Dark mode now follows the system, and a `.dark` / `.light` class on `<html>` overrides it for a future toggle.
- The system font (SF Pro on Apple devices) replaces Geist. A named type scale (`text-large-title`, `text-title-2/3`, `text-headline`) tightens tracking as size grows; small text opens slightly.
- The header is a sticky translucent bar (`material-bar`). Its hairline only fades in once content scrolls under it (`scroll-edge`, a scroll-driven animation).
- Navigation is a segmented control. The active pill glides between tabs on a critically damped spring from `motion` (`layoutId`).
- Presses give feedback on pointer-down (`press` utility: a quick 0.97 scale). The dialog dims the page and opens and closes with CSS transitions on a sampled spring curve (`--ease-spring`), which stay interruptible.
- Requirements use inset grouped lists; term columns sit on a faint tint and snap when scrolled sideways.
- `prefers-reduced-motion`, `prefers-reduced-transparency` and `prefers-contrast` are all handled in `globals.css`.

**Why.** The app is used daily, so calm and fast matters more than decoration. Springs and pointer-down feedback make it feel responsive, and the restraint keeps colour meaningful (course types, status).

**Contrast.** Text pairs still meet 4.5:1 and graphics 3:1 in both themes. The light "in progress" ring colour was darkened to `oklch(0.66 0.11 70)` to reach 3:1. "Done" uses its own green `--done` token (rings and status icons) rather than the wine primary, since green reads as finished at a glance. `--success` stays the pale pill fill.

**Rejected.** An Apple-neutral gray/blue palette (it would discard the Canvas Hub feel) and a sidebar (a top bar is enough for four sections and works better on a phone).
