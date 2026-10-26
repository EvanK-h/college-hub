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

## 2026-10-26: Colour roles, status palette and course-type hues

**Decision.** Give every colour one role and write the rules into the spec's Visual design section. Status uses grey / blue / green / amber / red (planned, in progress, done, due soon, overdue) for both courses and assignments. Course types move onto hues no status uses (rose 350, teal 195, violet 300, olive 90, plus two neutrals). Grey surfaces become three translucent fill tiers, text gets a third (tertiary) level, and the focus ring uses the tint.

**Why.**
- Measured in OKLab, the old AI-concentration olive was 5.8 ΔE from done green and Major support was 4.6 from the in-progress caramel, so a course's type and its status read as one signal on the same card.
- The 2026-10-21 entry already set due soon to caramel. With in progress also caramel, the two would collide once assignments arrive. Blue for "active" follows Apple's convention and frees amber for attention.
- The course hues came from a search that maximised the minimum distance to the status colours, the primary and each other in both themes; the best set keeps at least 10.3 ΔE.
- The focus ring was the same caramel as warning, so focused elements would look flagged.

**Considered and rejected.**
- *A wine dark-mode primary to keep one brand hue.* Measured at 6.7 ΔE from due soon and 8.6 from overdue, so the tint would read as an alert. Golden Batter stays.
- *Keeping in progress amber and making due soon orange.* Only 8.0 ΔE apart, and both warm.

**Also.** Wine is now reserved for actions, focus and the app icon (the page eyebrow became grey). Swap relevance pills are graded by rank. The pathway marks the current term and recedes finished ones, using a `phase` derived in `summarizeTerms`. Unused `sidebar-*`, `chart-*`, `success` and `warning` tokens are gone. Course cards carry a 4% tint of their type colour; 6% made the page read pink, since CS core is most of the plan.


## 2026-10-26: Canvas upserts live in Postgres functions

**Decision.** The sync writes through three SQL functions (`sync_assignment_groups`, `sync_assignments`, `sync_announcements`) called with `rpc`, not through supabase-js `.upsert()`. Each runs `insert ... on conflict (canvas_id) do update set <synced columns only>`.

**Why.**
- supabase-js `.upsert()` updates every column in the payload, so it cannot "guess `kind` on insert, then leave it alone". Either the payload omits `kind` (and inserts fail) or it includes it (and the update overwrites your correction).
- The update list in SQL is the guarantee that `progress`, `priority`, `est_hours`, `notes`, `read`, `important` and a corrected `kind` survive a re-sync, and it sits next to the constraint it depends on.
- A `where ... is distinct from` clause skips rows that haven't changed, so the function can report inserted, updated and unchanged counts for `sync_runs`; `xmax = 0` tells inserts from updates.
- The soft-delete (`deleted_in_canvas = true` for assignments missing from a fully fetched course) runs in the same transaction as the upsert.

**Security.** The functions write for whatever owner they are given, so `execute` is revoked from `public`, `anon` and `authenticated` and granted to `service_role` only. They also refuse a course that doesn't belong to the given owner. The service-role client has no `auth.uid()`, so `owner_id` is passed in explicitly.

**Consequences.**
- The "your columns survive" test has to run against a real Postgres (local Supabase), since a mocked client would prove nothing about SQL.
- Announcements are never soft-deleted: the sync only fetches 60 days, so a missing old announcement doesn't mean it was removed.
- Soft-deleted assignments are counted as `updated`. `sync_runs` has no separate column for them.

## 2026-10-26: `/api/sync/*` accepts the bearer token only

**Decision.** The sync route checks `Authorization: Bearer ${CRON_SECRET}` and nothing else. A signed-in browser without the header gets a 401. The "Sync now" button and the dashboard-load refresh are Server Actions that check the session and call `runCanvasSync()` directly. This replaces the earlier rule "bearer token or a signed-in session".

**Why.**
- A route that trusts the session cookie can be triggered from another site. Supabase's cookies are `SameSite=Lax`, which browsers send on top-level navigations (a link or a redirect) but not on cross-site image loads or POSTs. A GET that starts a sync would therefore be reachable by getting you to open a URL.
- The impact would be small, since a sync only reads from Canvas and is safe to repeat, but it would mean extra Canvas traffic at times you didn't choose.
- Nothing needs the cookie path: every legitimate caller is either cron (bearer) or the app's own UI (Server Action).

**Details.** The check compares SHA-256 hashes with `timingSafeEqual`, fails closed when `CRON_SECRET` is missing, and requires the secret to be at least 32 characters. The proxy lets `/api/sync/` through without a session because cron callers have none.

**Considered and rejected.**
- *Session accepted on POST only.* Lax cookies aren't sent on cross-site POSTs, so it would be reasonably safe, but it adds a second auth path to test and maintain with no caller that needs it.
- *Session accepted on both methods plus an `Origin` check.* Same cost, and it follows the original wording only on paper.

## 2026-10-26: Only one Canvas sync runs at a time

**Decision.** A partial unique index on `sync_runs (owner_id, source) where status = 'running'` allows one running sync per source. `syncCanvas` first closes `running` rows older than 10 minutes, then inserts its own `running` row; if that insert hits the unique violation (`23505`) it returns `{ status: "skipped" }` without touching Canvas or writing a row. The route answers 200 for a skipped run.

**Why.**
- Vercel Cron, `pg_cron` and the "Sync now" button can fire close together, and Canvas throttles parallel requests harder than sequential ones.
- A "look for a running row, then insert" check has a race: two requests can both see nothing running. The index lets the database decide, so exactly one insert wins.
- A run that crashes or times out would leave its row `running` forever. The 10-minute cleanup keeps one failure from blocking every later sync; a real run finishes well inside the route's 60-second limit.

**Consequences.** A skipped run is not an error, so it returns 200 and Vercel Cron does not show it as failed. If the final update of a finished run fails, its row stays `running` until the 10 minutes pass.
