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

## 2026-10-26: Two schedulers call one sync route

**Decision.** Vercel Cron calls `/api/sync/all` once a day (`0 6 * * *`, in `vercel.json`). A `pg_cron` job named `canvas-sync` calls the same route every two hours from 07:00 to 23:00 (`0 7-23/2 * * *`) through `pg_net`, via a `trigger_canvas_sync()` function. Both use `Authorization: Bearer ${CRON_SECRET}`. Neither knows about the other.

**Why.**
- Vercel's Hobby plan only allows cron jobs that run once a day, so on its own it would miss the "within two hours" goal.
- One route means one place that checks the token, runs the sync and records `sync_runs`. The single-run guard (2026-10-26) makes an overlap harmless.

**Secrets.** The app URL and `CRON_SECRET` live in Supabase Vault (`sync_app_url`, `sync_cron_secret`), added by hand in the SQL editor of each environment. The migration only creates the job and the function, so nothing secret is committed. Until both secrets exist the function skips with a notice, so local databases stay quiet. The function is `security definer` and executable only by the cron job's owner, not by `anon` or `authenticated`.

**Details and limits.**
- `pg_net` is asynchronous: the job fires the request and moves on. The response is kept in `net._http_response` for about six hours, which is where to look when a scheduled run seems missing. The request timeout is 60 s, matching the route's `maxDuration`.
- Both schedulers run in UTC, so the daily Vercel run is 06:00 London time in winter and 07:00 in summer.
- A failed or token-expired run answers 502, but nothing reads that status: failures show up in `sync_runs` and the token banner on `/settings`.
- Production needs the migrations applied (`supabase db push`) before the job can do anything; the job is created by the same migration that adds the function.

## 2026-10-27: Timetable sessions are keyed by UID + RECURRENCE-ID

**Decision.** `class_sessions` is unique on `(owner_id, ics_uid, recurrence_id)` with `nulls not distinct`, not on the UID plus start time the spec described. `recurrence_id` is null for a one-off event and the occurrence's original start for an occurrence of a repeating event, which is how iCalendar itself identifies an instance.

**Why.**
- Keyed on start time, a class moved to another slot became a new row, and the old one was marked cancelled. Your corrected `kind` and the `is_new` flag were lost, and the dashboard would show a cancellation that never happened. A DB test caught this for one-off events, which is likely how Celcat publishes every session.
- A moved occurrence of a repeating event keeps its RECURRENCE-ID, so it updates in place too.

**Also.**
- The sync parses the whole feed before writing, and refuses a feed with no classes matching a course in the plan. A login page or empty download therefore can't mark the whole timetable cancelled.
- Only future sessions (now to one year ahead) can be marked cancelled, since feeds often drop past events. The last 14 days are still refreshed, so a late room change lands.
- The real feed's titles read `Discrete Structures CS1800; Lecture`, not "CS 1800 …" as the spec assumed. The parser takes the last course code before the first semicolon (with or without a space) and guesses the type from the text after it. Events with no code (optional workshops, Study Hub, careers talks) and all-day events are skipped. Every one of the feed's 136 events is a one-off, with no RRULE.
- `kind` (lecture, lab, seminar, tutorial, workshop, exam, other) is guessed from the words after the course code on first insert, then left alone, like an assignment's kind.
- `sync_runs` bookkeeping (stale-run cleanup, the one-running-run lock) moved into `lib/sync/runs.ts` so both syncs share it. `/api/sync/all` and "Sync now" run Canvas, then the timetable. The timetable is skipped while `OUTLOOK_ICS_URL` is unset.

## 2026-10-27: No importer for the Notion to-dos

**Decision.** The `todos` table is created, but the Notion To-dos database is not imported by script, despite the Phase 3 checklist item. It holds a single row ("Revise for CS 2100 midterm"), which is re-entered by hand on the dashboard.

**Why.** An importer and its test would be more code than the one row it moves. The Notion schema (Task, Course relation, Date, Done) maps onto `title`, `course_id`, `due_on` and `done_at` if more rows ever appear.

**Shape.** `due_on` is a `date`, not a `timestamptz`, because to-dos are day-sized and the Notion dates were all date-only. "Done" is derived from `done_at` being set, so the dashboard can also show when a to-do was finished. `course_id` is `on delete set null`, so a to-do outlives its course link.

## 2026-10-27: Dashboard layout and refresh-on-load

**Decision.**
- Three columns above the fold. Today's classes, the next-exam countdown and a compact month sit on the left, what's due in the middle, to-dos and unread announcements on the right. The next six days follow below the fold.
- "Due" means unfinished work due in the next 72 hours plus overdue work from the past 7 days. Older overdue work stays on the course page only, so a paper assignment Canvas never marks as handed in doesn't sit on the dashboard all term.
- The month starts on Monday (UK convention, matching the London timetable). Deadlines get a dot and exams a bar, both neutral. They are kinds of event, not statuses, so status hues are not used. Classes aren't marked, since they fall on nearly every weekday.
- When the last successful Canvas sync is over 30 minutes old, a client component calls the `syncIfStale` Server Action once after the page opens, then refreshes the page. Cached data shows meanwhile. The action checks the session and reads the staleness from `sync_runs` itself, so calling it repeatedly can't sync more than once per half hour.
- Sign out moved from the dashboard to Settings.

**Why.** The dashboard answers "what do I do today" at a glance, so everything it shows comes from tested pure functions in `lib/dashboard/agenda.ts`: what counts as today, due soon, and the next exam. Days are calendar days in the current term's time zone.

## 2026-10-27: Calendar feed through a token-checked SQL function

**Decision.** `/api/calendar/<token>.ics` reads through `calendar_feed(token)`, a `security definer` function that anon may call. Given a token whose SHA-256 matches a row in `calendar_feeds`, it returns that owner's classes and deadlines; for anything else it returns null. Only the hash is stored. The full link is shown once in Settings when it is created, and making a new one replaces it.

**Why.**
- The feed has no session, and `CLAUDE.md` keeps the service-role key out of everything but the sync. The function gives the route exactly one narrow capability instead of bypassing RLS wholesale.
- With only the hash stored, a leaked table or backup can't be turned into a working link.
- The token is 32 random bytes (43 base64url characters). The function rejects anything else before it looks anything up.

**Trade-off.** The link can't be shown again later, so adding a second device means making a new link and re-subscribing the first. For one phone that is fine.

**Also.** The feed covers the last 60 days onwards. Classes are timed events with `STATUS:CANCELLED` when cancelled, and deadlines are zero-length events at the due time, as Canvas's own feed does. Responses are `Cache-Control: private, no-store` and `X-Robots-Tag: noindex`. `/api/calendar/` is a public path in the proxy, like `/api/sync/`.

## 2026-10-27: The timetable keeps every Outlook event

**Decision.** The timetable sync keeps every timed event in the Outlook feed, not only classes with a course code. `class_sessions.course_id` is now optional. Events with a code in the plan are linked to their course. Anything else (optional workshops, the Study Hub, E-Treks talks, an event whose code isn't in the plan) is kept unlinked and shown by its own title on the dashboard, the calendar and the phone feed. All-day events are still skipped. This replaces the "events with no code are skipped" note in the RECURRENCE-ID entry above.

**Why.** Outlook is the source of truth for every class meeting and is more up to date than Canvas. The optional sessions are real meetings worth seeing. On the real feed this adds 17 events to the 66 classes.

**Consequences.**
- The safety guard now refuses a feed with no events at all. It used to refuse a feed with no matching classes, and an empty or broken download still can't cancel the timetable.
- An event's type is guessed from the text after the course code, or from the whole title when there is no code ("Workshop; Optional class/workshop" → workshop). The catch-all type is labelled "Event", not "Class".
- `sync_class_sessions` checks course ownership only for rows that have a course, and `calendar_feed` left-joins courses. Both are replaced in a new migration, which keeps their grants.

## 2026-10-27: Prerequisites as an AND of OR-groups, checked as advice

**Decision.** `course_prereqs` stores each requirement as rows of (course, required code, `prereq` or `coreq`, group). Codes in the same group are alternatives, and every group must be met. The required course is a code, not a foreign key. The data is drafted from the Northeastern catalogue into `scripts/prereqs.ts` and loaded with `scripts/import-prereqs.ts`, which replaces the listed courses' rows so it can be re-run after edits.

**Why.**
- The catalogue is full of alternatives ("CS 2100 or CS 2510 or DS 2500"). Flat pairs, as the spec first described, would flag moves that are fine. Nested rules are rewritten into this form by distribution: "(A and B) or C" becomes [A or C] and [B or C].
- Alternatives are often courses that aren't in the plan, so they can't be foreign keys.
- The list is public catalogue data, so unlike the Notion exports it is committed. A test checks its shape: real codes only, no empty or duplicate groups, no course requiring itself.

**Rules.**
- A prerequisite must be in an earlier term, with transfer credit first.
- A corequisite (including the catalogue's "may be taken concurrently") must be in the same term or earlier.
- Term limits are 18 SH for a semester (the normal maximum without an overload petition) and 9 SH for a summer half term, an assumption kept in `TERM_SH_LIMIT`.
- Only planned courses can be moved.

**Advice, not enforcement.** A clean move saves straight away. A move with problems lists them and asks before saving ("Move anyway"), since the catalogue data has gaps (grades, placement, transfer equivalents). On the current plan the only flag is CS 2100's CS 2000/2500 prerequisite, which you placed out of.

**Drag and drop.** `@dnd-kit/core`, with a grip handle on each planned course so the card itself still opens the edit dialog. It works with a pointer, touch or the keyboard (Space, arrows, Space), with screen-reader announcements that read out the problems. The edit dialog runs the same checks as the term is changed.

## 2026-10-27: Recommended links, and a prerequisite graph laid out by term

**Decision.** `prereq_kind` gains a third value, `recommended`, for advice the catalogue gives but doesn't require. The prerequisite graph (`/pathway/graph`) puts each term in its own column and draws it with plain HTML and SVG, not React Flow.

**Recommended links.**
- MATH 2321 and MATH 2341 get MATH 1342 ("Prior completion of Calculus 2 is strongly recommended"), and PHYS 5352 gets PHYS 4115. The catalogue lists no prerequisite for PHYS 5352, but quantum mechanics is the plan's lead-in to it, and without the link the quantum chain wouldn't be a chain.
- Move checks ignore them. The graph draws them dashed and never marks them out of order.
- The other flagged entries were kept as drafted: CY 2550's two catalogue lines are read as one "or" list, and ECON 2350's programming corequisite is confirmed in the catalogue.

**Why a term-column layout.** The question the graph answers is "does the plan take things in the right order?", so time is the x-axis and an arrow should always point right. A general graph layout (React Flow with dagre or ELK, as the spec suggested) would place courses by dependency depth instead, losing the terms, and would add two libraries for something about 40 lines of layout code does. Within a column, courses are ordered by the average row of what they need, which keeps most arrows short.

**How it reads.**
- Only courses with at least one link are drawn. Solid arrows are prerequisites, dotted lines corequisites, dashed arrows recommendations; a thin line is one of several alternatives in the plan; red is out of order.
- The quantum chain is PHYS 5352 and everything it depends on (`chainTo`), shaded with the accent label colour and toggleable.
- Selecting a course lights up everything it depends on and unlocks and dims the rest. The panel underneath says the same in words, including requirements with nothing in the plan (CS 2100's placement), so the drawing is never the only way to read it.

## 2026-10-27: The Quantum / AI focus re-sorts swaps only

**Decision.** A Quantum / AI switch on the Swaps page, kept in a cookie. Swap options gain an `ai_relevance` column on the same scale as quantum relevance; the enum is renamed from `quantum_relevance` to `relevance` so both columns can use it. Swaps sort by the chosen relevance, with the other breaking ties, and each card shows both.

**Why only swaps.** The spec also asked the switch to highlight the courses each direction depends on. Built and tried, it added little: the quantum chain is six courses already shaded in the prerequisite graph, and the AI path was mostly required courses you take either way. Ranking 32 swap options by AI as well as quantum is the new information, so that is what was kept.

**Data.** AI ratings are drafted in `scripts/ai-relevance.ts` from the catalogue descriptions and loaded with `scripts/import-ai-relevance.ts`, the same draft-and-review flow as the prerequisites. Quantum relevance still comes from Notion, and the Notion import never writes `ai_relevance`, so re-importing keeps the ratings. A swap missing from the list is reported by the import and stays at "None" until it is added.

**Why a cookie.** The server sorts before rendering, and the choice should survive visits without living in every link.

## 2026-10-27: What-if plans hold moves and swaps, laid over the real plan

**Decision.** A plan (`plans` + `plan_courses`) places planned courses in terms and can take in swap options in place of courses. It can't add arbitrary courses. Plans live at `/pathway/plans`, with a board per plan and a side-by-side comparison of any two plans or the current one.

**How a plan reads.**
- Done and in-progress courses always sit in their real terms; plans only rearrange planned courses.
- A planned course with no row in the plan counts as being in its real term, so a course added after the plan was saved still shows up. A plan is a copy when made, but reads like a set of overrides.
- A swap takes the replaced course's place, credits and type. It has no catalogue prerequisites of its own, so the checks don't cover it.
- Only swaps named "CODE 1234 · Title" can go into a plan: the two combined options ("PHYS 2371 + 2372", "INSH 1600 or PHIL 1115") couldn't become one real course.

**Making a plan active.** `apply_plan()` does it in one transaction, as the signed-in user. Planned courses move to the plan's terms. Each swap rewrites the replaced course in place (code, title, term) rather than deleting it and adding a new one, so the slot keeps its requirement links. NUpath attributes, notes and catalogue prerequisites described the old course, so they are cleared, and the swap option stops listing the course as one it replaces. The plan's swap rows become ordinary rows afterwards, so the plan matches the real plan.

**Why moves + swaps.** Registration choices are mostly "take this instead of that, and when". Free-form courses would need requirement links and NUpath data entered by hand before they could be made real, and the swap options already carry that reasoning.

**Comparing.** Terms where the two plans differ are shown by default (every term on request). Each course is marked "Moved from …", "Swap for …" or "Not in …", with each term's SH and both plans' problems (`planProblems`: unmet requirements, co-op terms, terms over their limit). Unchanged courses sit flat and changed ones are raised and labelled, so the label carries the meaning, not the styling.

## 2026-10-29: Polish: install, theme toggle and ⌘K search

**Installable.** `app/manifest.ts` makes the site installable; it opens full screen on the dashboard. The icons are drawn in code from the header's logo mark (`app/icons/[file]/route.tsx`, prerendered at build), in the sizes a tab, the iOS home screen and Android's maskable icons need. Their paths end in `.png`, which the auth proxy already lets through. The manifest is fetched without cookies, so `/manifest.webmanifest` is a public path; it holds nothing private. There is no service worker: installing doesn't need one, and offline use isn't a goal while every page reads live data.

**Theme toggle.** System / Light / Dark under Settings → Appearance. It is a per-device preference, so it is kept in `localStorage`, not the database or a cookie: a cookie would make the root layout read request data and stop every page shell from prerendering. A one-line script in `<head>` applies a saved choice before the page paints, so there is no flash of the other theme. `globals.css` already honoured a `.light` / `.dark` class on `<html>`; the toggle sets it, and pins the browser-chrome colour to match.

**⌘K search.** A header button (and ⌘K / Ctrl+K) opens a search over pages, courses, assignments and announcements, with up to five results per kind. Pages match in the browser; the rest come from a Server Action reading with the user's session, so RLS applies. Typed text is stripped of ILIKE wildcards and PostgREST's filter separators before it reaches the query. Results open inside the app (a course page, or its Assignments or Announcements section), not Canvas. It follows the ARIA combobox pattern, with focus staying in the input and the highlighted result announced. It was built by hand rather than with a command-menu library, since it needs only one input and one list.

## 2026-10-29: End-to-end tests run against a separate server and an invented user

**Decision.** Playwright (`npm run test:e2e`, specs in `e2e/`) runs one test per main flow: signing in, the dashboard's to-dos, moving a course on the pathway (with and without a prerequisite problem), the grade calculator, a what-if plan from swap to "Make active", ⌘K search, and the theme toggle. It builds the app and serves it on port 3100, wired to the local Supabase stack, and signs in as an invented user (`e2e@example.test`).

**Why a separate server.** The dev server reads `.env.local`, which holds the real Canvas token and your `OWNER_ID`. The dashboard syncs Canvas when its data is stale, and the sync writes as `OWNER_ID`, so a test run against it could pull real Canvas data into your account. The test server is given its own environment instead, which Next lets win over `.env.local`: local Supabase keys (read from `supabase status`, so it can't reach production), the invented user as `ALLOWED_EMAIL` and `OWNER_ID`, and empty Canvas and timetable settings. The seed also records a fresh successful sync, so no sync starts. A production build also catches what dev mode hides, such as Cache Components errors.

**Sign-in is the real flow.** The setup test requests a magic link through the login form, reads it from local Mailpit, and follows it through `/auth/callback`, then saves the session for the other tests. `http://localhost:3100/auth/callback` is in the local redirect allow-list for this.

**Data.** `e2e/seed.ts` rebuilds the user's data from scratch before each spec file: five invented courses, a prerequisite chain, a half-graded course for the calculator, and one swap option. Term ids (900–904) and names ("Test Fall 2026") can't clash with real terms, since term ids and names are unique across all owners. The specs share that user, so they run one at a time.

## 2026-10-29: Session reads wait for the request (`connection()`)

**Decision.** `lib/supabase/server.ts` awaits `connection()` before building the client.

**Why.** With `partialPrefetching`, Next pre-renders each route's App Shell, including the parts that read `cookies()`, and refuses the clock while doing it. The Supabase auth client calls `Date.now()` as soon as it is built, so every page logged "encountered the unstable value `Date.now()` while prerendering" (first seen 2026-10-27, and in every e2e server log). Everything read through this client is per-request, so nothing is lost by waiting for the request: the prefetched shell shows each page's Suspense fallback, and the data streams in as before.

## 2026-10-29: Any school: categories are data, and a degree is a data folder

**Decision.** The app no longer hard-codes one Northeastern degree. Course types, requirement areas, swap slots, attributes (NUpath) and focuses (Quantum, AI) are per-owner tables. A `profiles` row holds the school, credit unit, grade scale and term credit limits. Pages read all of these through `lib/setup/load.ts`. A degree is described by a data folder (`data/<name>/`, six JSON files checked by Zod in `scripts/data-folder/format.ts`) and loaded with `npm run import`. `npm run export` writes the database back out to one. Migration `20261029112437_make_categories_data` converted the existing rows in place, so requirement links, plans and notes survived.

**Why.** Two uses: the site you use every day, and a project others can clone and fill with their own degree. Enums suit sets that are the same everywhere; course types and requirement areas are not. Statuses, term kinds, prerequisite kinds, the relevance scale and session types stay enums. The "closed sets are enums" rule in CLAUDE.md is narrowed to match.

**The Northeastern preset.** `"preset": "northeastern"` fills in what every Northeastern student shares: SH, the registrar's grade scale, the 18/9 SH limits, the 13 NUpath attributes and catalogue prerequisites (moved from `scripts/prereqs.ts`). Anything the folder sets wins, including a course's own `prereqs.json` entry. Plan-specific calls that used to live in the catalogue list, such as counting CS 3001 as part of CS 3000 and PHYS 4115 leading into PHYS 5352, are now overrides in your own folder.

**Colours.** A course type stores an index (1–6) into the vetted category palette (`--category-N`), not a colour. Any type a student invents still gets a colour checked for contrast and ΔE in both themes.

**Import rules.** Every write is an upsert on a natural key (name, code or term position), so re-importing updates rows in place and keeps their ids, Canvas links and synced data. Nothing missing from the folder is deleted. Course attributes and prerequisites are replaced for the listed courses, so they match the files. Terms take consecutive ids in file order, since ids are the sort order; `--first-term-id` moves them, and the import refuses ids that belong to another owner. The import targets the local stack unless `--remote` is given, which reads `.env.local` and asks first, so a slip can't write to production. It creates the user (confirmed) if needed, since sign-ups are off.

**Your data.** `data/mine` (gitignored, with everything else under `data/` except `data/example`) is exported from your database and replaces the Notion CSVs and the one-off importers (`import-notion`, `import-prereqs`, `import-ai-relevance`). The import check (56 courses, 171 SH, 53 SH transfer, 31 requirements, 32 swaps) now runs against it. `data/example` is an invented biology student at an invented school with no preset. A database test imports each folder for a throwaway user and checks that it exports back unchanged.

**Terms per owner.** Term names were unique across all owners, which kept two students from both having a "Fall 2026" in one database. They are now unique per owner (`20261029113600_terms_names_per_owner`). The e2e user's plan is also a data folder (`e2e/data`), imported by the seed with term ids from 900, and its terms drop the "Test" prefix.

## 2026-10-29: Design roadmap: structure, dashboard, calendar and course colours

**Decision.** Adopt the four structural changes in `docs/design-roadmap.md`, to be built in the order it lists:
- **Navigation.** Four places replace the seven flat tabs: Today, Calendar, Courses (a new `/courses` index of this term's courses) and Plan. Plan has its own second-level control for Board, Requirements, Swaps, Prerequisites and What-if. Settings becomes a gear button. On a phone the four places move to a bottom tab bar.
- **Today.** The dashboard is rebuilt around a Now / Next strip (next class, next deadline, next exam) and one agenda list for the coming week, with to-dos and announcements beside it. The mini month and the separate Today, Due and This-week cards go.
- **Calendar.** The week view becomes a time grid (sessions as blocks sized by duration, deadlines in an all-day strip). The list stays as a day or agenda view on a phone.
- **Course colours.** Colour keeps marking course *type* only. Current courses are told apart by a code badge, not a per-course hue: the ΔE budget between the status and category palettes has no room for 6–8 more hues.

**Why.** The review found the app's visual language sound and its structure the weak point: seven tabs that aren't peers (four are views of the plan), no way to browse courses, a dashboard whose five equal cards give nothing priority and show empty panels on quiet days, and a week view that can't show free time or clashes.

**Also: "Missed" assignments.** Work more than 30 days past its deadline without a submission is shown as Missed (neutral grey, a circle-with-a-dash icon), not Overdue. Canvas copies old assignments into new courses (a 2024 lab showed as "Overdue · 753 d ago"), and a red status that never clears stops meaning "act now". Comparing with the term's start date would be more precise, but terms have no dates yet (2026-10-25 decision), so it is a fixed age.

## 2026-10-29: Colour pass: surfaces, plain cards, today marker, and a test for the rules

**Decision.** Retune the surfaces, drop the course-type tint from cards, mark today with a filled circle, allow one filled primary button per view, and enforce the spec's colour rules with a test (`lib/colour/tokens.test.ts`) that reads `globals.css`.

**Surfaces** (light / dark):
- `--background` `0.962 0.006 80` / `0.165 0.006 60`; `--card` `1 0 0` / `0.22 0.008 65`; `--popover` `1 0 0` / `0.25 0.01 65`.
- Light cards are pure white on warm paper, 3.9 ΔE from the page (was 2.9), so they separate by value as well as shadow. Dark surfaces lose most of their chroma (0.006–0.01, was 0.01–0.013), which read as brown, and step up in lightness: card 5.5 ΔE above the page, popover 3.0 above the card.
- Tertiary text keeps at least 4.57:1 wherever it's allowed (page, card, popover) in both themes; dark popover was tried at 0.255 and dropped to 4.50.
- The theme-color and manifest hex values now come from one constant, `CHROME_COLOURS` in `lib/theme.ts`, which the test checks against `--background`.

**Two course-type colours failed the existing rules,** found by the new test, which measures in OKLab the way the 2026-10-26 entry describes:
- Light teal (AI concentration) was 9.7 ΔE from done green. It moves to `oklch(0.57 0.095 196)`, 3 ΔE from the old teal.
- Light olive (Major support) was 7.5 ΔE from due-soon amber, and outside sRGB. No olive inside sRGB near that hue clears 10, so it becomes moss green, `oklch(0.43 0.105 122)`: 10.2 ΔE from due-soon and done. Dark mode keeps its olive, which passes.
- The 2026-10-26 entry's "at least 10.3 ΔE" didn't hold for these two in light mode; the likely cause is that the values were measured before later tweaks, with no test to catch the drift.

**Rules the test enforces:** text 4.5:1 (foreground, muted and tertiary on page, card and popover; status colours and the tint on cards; primary-foreground on primary); course types 3:1 on cards; chromatic course types at least 10 ΔE from every status, the tint and each other; every token inside sRGB, since a clipped colour would make the numbers meaningless on an ordinary screen.

**Neutral course types.** General elective and Co-op / program are greys, 1.4–2.1 ΔE from planned's grey. That was always so; the spec's wording claimed otherwise. Planned is the absence of a status hue, and a planned course always shows its empty-circle icon, so the pair is exempt rather than recoloured.

**Also.**
- Course cards drop their 4% type tint (2026-10-26); the bar carries the type. The tint made the board read pink in light mode and maroon in dark.
- Today is a filled circle in the foreground colour (`TODAY_MARKER_CLASS`) in the mini month, the month view and the week view. The ring it replaces read as a focus ring.
- At most one filled primary button per view: the calendar feed button and a plan's "Try it" become outline (Sync now and Make active are those pages' actions), and the to-do "Add" becomes a ghost + icon ("Add to-do"; Return still adds).
