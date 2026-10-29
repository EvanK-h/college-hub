# Design roadmap

A review of every page's UI and UX (29 Oct 2026), made from the code and from the running app in light and dark mode at 1440 px. I couldn't render the phone layout, so the mobile notes come from the code. Each item says what to change, why, and where. Items marked **Decision** change the app's structure or a rule in the spec's Visual design section, so they need your call (and a `decisions.md` entry) before they're built.

Principles used throughout, from Apple's HIG and WWDC talks: wayfinding (where am I, where can I go), hierarchy (the most important thing is the most obvious), direct manipulation, immediate feedback, forgiveness over confirmation, and progressive disclosure.

**What already works and should stay:** the colour-role system and its ΔE discipline, the translucent header with its scroll-edge hairline, press feedback on pointer-down, the spring-sampled `--ease-spring`, handling of all three `prefers-*` settings, status shapes that never rely on colour alone, and the ⌘K palette's combobox semantics. Most of what follows is about information architecture and hierarchy, not the visual language.

## Still open

Everything that was deferred or left out while building the sections below, so none of it gets lost. Tick an item off when it's built and note where; when something is deferred, add it here.

- [ ] §1.6 Smaller colour notes.
- [ ] §2.4 Collapsing large title.
- [ ] §2.5 The command palette becomes a command palette (actions as well as search).
- [ ] §4.2 Month view and §4.3 Keyboard shortcuts for the calendar.
- [ ] Announcements inbox ("See all" on Today), from §3. With the toasts in §8.2.
- [ ] Mark an announcement read when it's opened, from §3. With §8.2.
- [ ] Undo for to-dos, from §3. With §8.2.
- [ ] The course edit dialog as a bottom sheet on phones, from §5.3. With §8.5.
- [ ] "New plan" dialog as a bottom sheet on phones, from §5.7. With §8.5.
- [ ] Rubber-banding at the prerequisite graph's edges, from §5.6. Needs the pan to move a transform rather than native scroll, so it can overshoot. With §8.4.
- [ ] Merge the graph into the board as a "Board | Graph" toggle, from §5.6. **Decision**: it removes a Plan tab.

Decided against, not open: an amber step on the term credit meter (the profile has one limit per kind, see "Pathway board, as built").

---

## 0. Bugs and quick fixes (small, no design decision)

**Done 29 Oct 2026.** Two changes from the plan below: terms have no dates yet, so 0.3 marks work as Missed once it is more than 30 days overdue (see the 2026-10-29 decision), and missed rows are muted in place rather than collapsed under a "Past" disclosure. 0.4 shows the date in the app's format behind a button that opens the native picker, which keeps the browser's own date entry.

| # | Where | Problem | Fix |
|---|---|---|---|
| 0.1 | `components/main-nav.tsx:28` | `active = pathname === href`, so `/courses/*`, `/pathway/plans/*` and `/calendar?…` subpages highlight no tab. You lose "where am I" on exactly the deep pages. | Match the longest prefix: a link is active when `pathname === href` or `pathname.startsWith(href + "/")`, and the longest matching href wins (so `/pathway/requirements` beats `/pathway`). Courses should light up Dashboard, or a Courses tab once it exists (§2.2). |
| 0.2 | `lib/announcements/text.ts` `excerpt()` | Dashboard previews start with "• Hello everyone": Canvas wraps the body in `<ul><li>`, and `htmlToText` turns that into a bullet. | Strip a leading `•` in `excerpt()` (not in `htmlToText`, where the bullets are right). Add a test. |
| 0.3 | Course page, "Imported Assignments" | An assignment from Oct 2024 shows **Overdue · 753 d ago** with a **Start** button. It's noise, and the red status loses meaning. | Treat work due before the course's term began as "Missed" (neutral, not red) and collapse it under a "Past" disclosure. Past ~14 days, `formatDueIn` should give a date, not "753 d ago". |
| 0.4 | To-do form, `components/dashboard/add-todo-form.tsx` | The native date input shows `mm/dd/yyyy` while the rest of the app is `en-GB` (29 Oct). | Set `lang="en-GB"` on the input, or replace it with a small "Due" button showing a formatted date (see §3.4). |
| 0.5 | What-if plans, "New plan" | The name placeholder ("CY 4770 instead of CS 4805") is dark enough to look like a filled-in value. | Start it with "e.g." and use `placeholder:text-tertiary-foreground`. Apply that to every input. |
| 0.6 | Calendar month, `app/(app)/calendar/page.tsx:172` | Past days get `bg-fill-tertiary`, future days a white card. Late in a month most of the grid is grey, so the page looks disabled, and the days you care about (ahead) are the minority. | Swap them: past days sit flat on the page with tertiary text, today and later get the card. |
| 0.7 | Touch targets | The to-do tick and delete buttons are `icon-xs` (24 px), and the calendar day number link is 24 px. Apple's minimum is 44 pt. | Keep the visual size but widen the hit area with a `::before` (inset −10 px), or make the whole row or cell the target. |
| 0.8 | To-do delete, `todo-list.tsx` | The delete button only appears on hover or focus, so on a phone it's invisible. | Show it under `@media (hover: none)`, or use swipe-to-delete (§6.3). |
| 0.9 | Course page assignment groups | "Set Exercises 1 (25%)" sits next to "25% of grade": the weight shows twice. | When the group name already ends in `(NN%)`, drop "of grade" from the meta line. |
| 0.10 | Timetable locations | "Portsoken COMBINED 528 & 532 [94 cap]" wraps over 2–3 lines in every narrow column (week view, This week). | Add a `shortLocation()` in `lib/timetable/format.ts` that drops `[NN cap]` (capitals stay, so building acronyms survive). Keep the full string in a `title` attribute. |
| 0.11 | Sync status | "Syncing…" lives in an empty `role="status"` span, and nothing animates. | Show a small spinning `RefreshCw` next to "Synced 41 min ago" while it runs, and turn the label into a button that syncs now. |

---

## 1. Colour scheme

**Done 29 Oct 2026 (§1.1–1.4)**, with the numbers in the decision log. Changes from the plan below: the dark card ended at `0.22` and the popover at `0.25` (tertiary text needed the margin); light popovers are white like cards; no type dot was added to cards, since the bar already carries the type; and the new colour test turned up two light course types that broke the ΔE rule, so teal shifted slightly and olive became moss green. §1.5 was decided as option A; §1.6 is still open.

The role system is sound: one meaning per hue, measured distances, and two text levels. What's worth changing is how the surfaces and tints *feel*, which is a bit muddy in dark mode and a bit pink on the pathway. Every token change below has to pass the existing 4.5:1 / 3:1 and ≥10 ΔE checks before it lands.

### 1.1 Surfaces: more separation, less brown (light and dark)

| Token | Now | Proposed | Why |
|---|---|---|---|
| `--background` light | `0.968 0.007 80` | `0.962 0.006 80` | A touch darker, so white cards separate by value and lean less on shadow. |
| `--card` light | `0.997 0.002 85` | `1 0 0` | A true white card reads cleaner against warm paper. The warmth stays in the page. |
| `--background` dark | `0.155 0.01 55` | `0.165 0.006 60` | Lower chroma: at L 0.155 the brown reads as mud, not warmth. |
| `--card` dark | `0.205 0.012 55` | `0.215 0.008 65` | Apple's dark mode shows elevation by getting lighter, and the step needs to be visible without the 0.5 px ring. |
| `--popover` dark | `0.225 0.013 55` | `0.255 0.01 65` | Dialogs and the palette sit one clear level above cards. |

Update the `themeColor` metas and the `CHROME` map in `theme-toggle.tsx` to match (and ideally generate both from one place, since they're hand-mirrored now).

### 1.2 Course-type tint on cards

The 4% `--course` tint on pathway cards makes the board read pink in light mode (CS core is most of the plan) and maroon in dark, where 4% of a light rose on a dark card goes far further. The bar already carries the type.

- **Proposed:** remove the card fill tint. Keep the bar and add a tiny type dot to the credit line. If you want *some* tint, keep it light-only, at 3%.
- This also fixes the graph, where tinted and accent-shaded nodes compete.

### 1.3 Today marker

Today is a `ring-2 ring-foreground` circle in three places (mini calendar, month view, week view). A ring reads like focus or selection.

- **Proposed:** a filled `bg-foreground text-background` circle, like Apple Calendar's filled marker but neutral, since wine is reserved for actions. Put it in one `TodayMarker` component used everywhere.

### 1.4 Primary (wine) usage

Wine is used correctly (buttons, focus), but it appears on low-value actions ("Add" on the to-do form, "Save a copy") as often as on the main one ("Sync now"), so no page has one obvious primary action.

- **Rule to add:** at most one filled primary button per view. Secondary actions use `outline` or `secondary`. Inline adds (to-do "Add") become the Return key plus a ghost `+` icon.

### 1.5 **Decision:** a course identity colour

Today a course's colour is its *type* colour, so CS 1800, CS 1802, CS 2100 and CS 2101 are all the same rose. On the dashboard and calendar, where you scan *this term's* courses, that colour tells you nothing.

- **Option A (recommended):** keep colours for types only, and give each current course a monogram chip (`CS 1800` in a rounded mono badge) for scanning. No new colour role, so nothing to re-measure.
- **Option B:** add a "Course" role, letting each current-term course pick from 6–8 hues, the way Canvas course colours work. It reads much faster in a calendar, but the ΔE budget is already spent between status and category, so it would need a fresh search and probably dropping type colours outside the pathway.

### 1.6 Smaller colour notes

- The relevance pills on Swaps ("AI: Low" on accent, "Quantum: Low" on fill) are too close to tell apart. Show the rank as a 4-step mini meter (●●○○) next to the word.
- The prerequisite graph shades the focus chain in `accent` (Golden Batter). Accent is also "co-op term", and its beige reads as "selected". Shade the chain with a **thicker edge plus a 1 px accent-foreground ring** and keep node fills neutral.
- In the dark-mode header the app icon becomes a pale Golden Batter tile. It's correct by the rules, but the icon loses its identity. Consider keeping the icon wine in both themes with a light glyph: the icon is brand, not tint.

---

## 2. Navigation and information architecture

**Done 29 Oct 2026 (§2.1–2.3)**; see "Navigation as built" in the decision log. The board's tab is labelled "Pathway" (its page title), not "Board". §2.4 and §2.5 are still open.

### 2.1 **Decision:** restructure the top nav (7 flat tabs → 4 places)

The segmented control holds 7 peers, but they aren't peers. Requirements, Swaps and Prerequisites are views of the degree plan, What-if plans is hidden behind a button on Pathway, Settings is utility, and "Dashboard" is a generic label. A segmented control is for 2–5 sibling views. With 7 it scrolls sideways on a phone and hides Settings.

Proposed:

```
[icon] College Hub     Today   Calendar   Courses   Plan              [Search ⌘K]  [⚙]
                                                     └─ Board · Requirements · Swaps · Prerequisites · What-if
```

- **Today** instead of "Dashboard": it names the contents.
- **Courses** is new (§2.2).
- **Plan** has its own second-level segmented control under the page title (in `app/(app)/pathway/layout.tsx`), so the five plan views stay one click apart without crowding the global bar.
- **Settings** becomes a gear icon button at the far right.
- **Phone:** the four places move to a bottom tab bar (a translucent `material-bar`, safe-area padding, icons + labels), and the top bar keeps only the title and search. This is the single biggest mobile improvement.

### 2.2 Add a Courses index (`/courses`)

At the moment a course page can only be reached through a link on the dashboard or through search. Add a grid of this term's courses, each card showing: code + title, the type bar, current grade + letter, next deadline, next class, and unread announcements. It's the natural home of the "Canvas Hub" half of the app, and it gives course pages a parent for back navigation.

### 2.3 Breadcrumbs and a back link on deep pages

Course pages, plan detail and compare pages have no way up except the browser's back button. Replace the uppercase eyebrow on those pages with a back link (`‹ Courses`, `‹ What-if plans`). Keep the eyebrow only where it adds information (the dashboard's term name).

### 2.4 Collapsing large title

Every page opens with a 38 px large title, then the content. On scroll, fade the page title into the header bar's centre (a scroll-driven animation like `scroll-edge`, with `animation-timeline: scroll(root)` and range 40–80 px). That's the iOS large-title behaviour, and it keeps "where am I" visible on long pages (Requirements, Swaps, course pages).

### 2.5 The command palette becomes a command palette

It searches but can't *do* anything. Add actions: "Add to-do…", "Sync now", "Go to CS 1800", "Switch to dark", "New what-if plan". With an empty query, show recent pages and this term's courses instead of nothing.

---

## 3. Today (dashboard)

**Done 29 Oct 2026 (§3.1, §3.2, §3.4's collapsed form, §3.3's deep link)**; see "Today and the calendar's week grid" in the decision log. The announcements inbox, mark-read-on-open and Undo for to-dos moved to §8.2, where the toasts come in.

### 3.1 **Decision:** rebuild around "Now / Next"

Three equal columns give five cards equal weight, so nothing leads. On a day with no classes and nothing due (as on 29 Oct), two cards are empty, and the Due column stretches into a tall blank white panel. "This week" sits below the fold and repeats the calendar.

Proposed layout (still no scrolling on a laptop):

```
┌──────────────────────────────────────────────────────────────┐
│ Thursday 29 October                      Synced 41 min ago ↻ │
├──────────────────────────────────────────────────────────────┤
│ NOW / NEXT  ▸ Next class  Mon 09:00 · CS 2100 lecture · Portsoken 528  │
│             ▸ Next due    AE3 Set Exercises 3 · Fri 13:00 · in 8 d     │
│             ▸ Next exam   …                                            │
├────────────────────────────────────────┬─────────────────────┤
│ AGENDA (today + next 6 days, one list) │ TO-DOS              │
│ Today ── nothing scheduled             │ ○ …                 │
│ Fri 30 ── free                         │ + Add a to-do       │
│ Sat–Sun ── free                        ├─────────────────────┤
│ Mon 2 Nov                              │ ANNOUNCEMENTS · 8   │
│   09:00 CS 2100 lecture  Portsoken 528 │ …                   │
│   11:00 CS 1800 lecture                │ See all 8 →         │
│   Due 13:00 Journalistic Article  ○    │                     │
└────────────────────────────────────────┴─────────────────────┘
```

- A single **Now / Next** strip replaces the empty states. "No classes today" becomes "Next class: Mon 09:00". It never shows a dead end.
- A single **Agenda** list replaces the Today card, the Due card and the This-week grid: one timeline, with consecutive empty days collapsed ("Sat–Sun · free"). Due items sit in their day with their status pill.
- **Drop the mini month.** `/calendar` does that job, and the dots on it carry little information. If you want to keep a glance, use a 7-day strip with deadline counts above the agenda.
- On phone the order is Now/Next → Agenda → To-dos → Announcements.

### 3.2 Due

If the card stays: never show an empty 72-hour window. List the next N deadlines, grouped under "Next 3 days" and "Later". Each row gets a check-style control to mark it in progress or done, matching what the course page offers.

### 3.3 Announcements

- "8 unread" but only 3 shown, with no way to see the rest except course by course. Add "See all" to an **Announcements inbox** (`/announcements`, or a filter on the Courses page) with read/unread and important filters.
- Clicking a title goes to the course page but doesn't open or mark the announcement. Link to `/courses/cs-1800#announcement-<id>` and open that `<details>` on load. Opening it should mark it read, with an undo toast.

### 3.4 To-dos

- The form always shows three fields, so the input form is half the card. Collapse it to one input. Show the course and date controls only once the input has focus or text, or parse simple tokens ("Read ch 3 #CS1800 fri").
- Ticking a to-do waits on the server with no feedback. Use `useOptimistic`: the circle fills with a check, the title strikes through, and the row collapses after ~600 ms, with an **Undo** toast. Forgiveness beats both confirmation and silence.
- Delete also gets an Undo toast instead of being instant and permanent.

---

## 4. Calendar

**§4.1 done 29 Oct 2026.** The phone keeps the list as its week view; a separate Day view wasn't needed. §4.2 and §4.3 are still open.

### 4.1 **Decision:** a time-grid week view

The week view is seven narrow text columns, so you can't see free time, clashes or the length of a session. For a timetable, a time grid (08:00–20:00 rows, sessions as blocks sized by duration, a "now" line on today) is the expected form and the most useful one.

- Blocks: course code + kind on the first line, short location on the second, cancelled sessions with a hatched fill and strikethrough.
- Deadlines go in an all-day strip at the top of each column (a pill with the status icon), since they're points in time, not spans.
- On phone, fall back to the current list as a **Day** or agenda view.

### 4.2 Month view

- Fix the past/future fill (0.6) and the today marker (1.3).
- Make the **whole cell** the link to that week (or day), not the 24 px number.
- Entries truncate hard ("Academic Writing Works…"), and assignments look like events. Give each entry a leading glyph: ● class or event, ◇ due (coloured by status, overdue red), and a bold **Exam** label. Show at most 3, then "+2 more".
- On phone, drop `min-w-2xl` (it forces sideways scrolling) and use the iOS pattern: a compact month with dots on top and the selected day's agenda below.

### 4.3 Keyboard

Add `←` / `→` for previous and next, `T` for today, and `M` / `W` for the view. Show them in the buttons' tooltips.

---

## 5. Plan (pathway and friends)

**Done 29 Oct 2026 (§5.1–5.3)**; see "Pathway board, as built" in the decision log. Changes from the plan below: the profile has one credit limit per term kind, so the meter has no amber step (neutral up to the limit, red over it); the board only scrolls to the current term when it would start off-screen, since a folded transfer column leaves it in view; and the phone bottom sheet waits for §8.5.

### 5.1 Pathway board

- **Degree progress header.** The page answers "what's where" but not "how far am I". Add a one-line summary above the board (for example `X of Y SH · N terms left · graduating <term>`), with a thin segmented bar (done / in progress / planned in the status colours).
- **Scroll to the current term** on load (`scrollIntoView({ inline: "start" })` on the `aria-current="step"` column). At the moment the first visible column is Transfer credit, which is history.
- **Collapse finished terms.** Transfer credit and finished terms become narrow summary columns (`Transfer credit · 13 courses · 53 SH ✓`) that expand on click. More of the future fits on screen.
- **Credit load per term:** replace "18 SH" with a small meter against the profile limit (`18 / 18`). It turns amber over the soft limit and red over the hard one, using the existing status hues. The drag preview already computes this.
- **Legend as a filter.** Clicking "AI concentration" dims every other type. The legend becomes a tool instead of a caption (keep the labels, and use pressed buttons for a11y).

### 5.2 Drag and drop (direct manipulation)

- **Grab the card, not the grip.** Only the 28 px grip handle starts a drag. Make the whole card draggable with the existing 6 px activation distance, so a tap still opens the edit dialog. Keep the grip as the keyboard activator.
- **The overlay matches the card.** At the moment the overlay is a different, code-only box rotated 1°, so the card visibly changes shape when you grab it. Render the full `CourseCardBody` in the overlay with `scale: 1.03` and `shadow-raised`, and drop the rotation. Respect the grab offset (dnd-kit already does).
- **Drop animation.** Set `DragOverlay`'s `dropAnimation` to a critically damped curve (`--ease-spring`, ~300 ms), so the card settles into its slot instead of vanishing. Use the same curve for "put back" when a drop is cancelled.
- **Auto-scroll** the board when dragging near its edges (dnd-kit's `autoScroll`, tuned to accelerate gently).

### 5.3 Edit course dialog

- Status as a three-segment control (○ Planned · ◐ In progress · ✓ Done) instead of a `<select>`. It's one tap, and it shows the status shapes.
- Add context: requirements this course satisfies, prerequisites (met or unmet), and a link to the course page when one exists.
- On phone it becomes a bottom sheet (§6.2).
- Grow the dialog from the card (set `transform-origin` from the trigger's rect), so it reads as the card opening rather than a box appearing in the middle.

**Done 29 Oct 2026 (§5.4–5.7)**; see "Requirements, swaps, graph and what-if plans, as built" in the decision log. Changes from the plan below: requirement chips link to the course page (not the board); the graph pans with momentum but doesn't rubber-band, because it pans by native scrolling, which stops at the edges; the graph stays its own page (merging it into the board is still open); and "New plan" opens a dialog, which becomes a sheet on phones with §8.5.

### 5.4 Requirements

- **Hierarchy.** Eleven equal rings, mostly at 0. Make the headline areas (CS required, AI concentration, Physics minor, NUpath) large, and the rest a compact row of small rings.
- Shorten the captions to "9 to go" or "1 in progress · 1 to go". "0 done · 0 in progress · 9 not started" wraps onto two lines on every card. The legend explains the arcs once.
- **Rings are links** that scroll to their section.
- **A "Show unmet only" filter** for the list sections.
- Course chips in requirement rows link to the course on the board (or its course page), and use `text-sm` rather than `text-xs`.

### 5.5 Swaps

- **Progressive disclosure.** Each swap is a large card with two reason panels, so you scroll a lot to compare a handful of options. Show compact rows (`PHIL 1115 → replaces ECON 2350 · Spring 2027 · Quantum ●○○○`) that expand to show the reasons.
- **Label the focus toggle**: "Rank for: Quantum | AI". At the moment it's two unexplained words.
- **"Try in a what-if plan"** on each swap: it creates or opens a plan with the swap applied. Today that takes three pages: create a plan, open it, pick the swap from a long select.

### 5.6 Prerequisites graph

- **Hover highlights** on pointer devices (selection stays click), so you can explore a chain without clicking every node.
- **Pan by dragging** the canvas with momentum (project the release velocity, §6 of the motion skill), rubber-banding at the edges, plus zoom-to-fit. At the moment it's a horizontal scroll box, and you lose the overall shape.
- **Fewer crossings.** Order nodes within a column by the barycentre of their parents (one or two sweep passes in `lib/pathway/graph.ts`). That's cheap, and it removes most of the tangles in the Fall 2027 column.
- **Consider merging into the board**: the graph and the board are both laid out by term. A "Board | Graph" toggle on one page would cut a nav item and keep your scroll position.

### 5.7 What-if plans

- One list, not three cards: each plan row gets **Open · Compare with current · ⋯ (Rename, Delete)**, and "New plan" becomes a button that opens a sheet.
- **Mode banner on plan pages.** Editing a what-if plan should look different from the real plan: a persistent accent strip under the header ("What-if: dunno · 1 change · Make active / Discard"). It answers "where am I" and stops you treating it as the real plan.

---

## 6. Course page

**Done 29 Oct 2026**; see "Course page, as built" in the decision log. Changes from the plan below: the grade breakdown shows once two or more groups have graded work (one group would be a single full bar); announcements moved into the main column rather than behind tabs; and the rail isn't sticky, because on a laptop it's taller than the screen.

- **One assignments card**, not one card per group. Groups with a single assignment each produce a stack of five near-empty cards. Use one inset grouped list with group subheaders that carry their weight and running percentage.
- **Status is the control.** Replace the ambiguous ghost "Start" / "Pause" text button with a status pill you can click (a menu: Not started / In progress). Canvas still owns "Done".
- **The grade card shows where the grade comes from:** a stacked bar of each group's weighted contribution under the big number. The target picker becomes a row of letter chips (A, A−, B+ …) with the needed average shown right under it, and red when it's out of reach.
- **Balance the layout.** The left column ends early and the right rail runs on, leaving a large empty area before Announcements. Move announcements into the main column under assignments (or behind tabs: Assignments · Announcements · Classes), and keep the rail for Grade, Next class and Notes.
- **Notes autosave** (debounced, with a quiet "Saved" note) instead of a Save button, the Apple Notes way.
- **Type identity in the header:** the course's type bar beside the title, and the type name in the eyebrow.

---

## 7. Settings and login

**Done 29 Oct 2026**; see "Settings and login, as built" in the decision log. A suggested course link still needs a "Link it" press, since saving a guess silently would sync the wrong course if the guess were wrong.

- **Inset grouped sections** (the iOS Settings pattern) for Sync, Course links, Calendar feed, Appearance and Account.
- **Move "Sign out"** from directly under the title to an Account section at the bottom. It's the least-used action on the page and currently the first one.
- **Course links autosave on change**, with an inline ✓ / error, instead of seven Save buttons. Show the full Canvas course name under the select, since it truncates.
- **Fold sync history** to the last 5 runs, with "Show all".
- **Login:** after sending, switch the card to a "Check your email" state with the address and a resend button on a 30 s countdown, instead of a status line under the button.

---

## 8. Cross-cutting

### 8.1 Loading states

**Done 29 Oct 2026** (`components/skeletons.tsx`; the pulse runs only when motion is allowed). Every page showed a bare "Loading…" paragraph, so the layout jumped when data arrived. Give each Suspense boundary a **skeleton** shaped like its content (card outlines with `bg-fill-tertiary` bars and a slow, reduced-motion-safe shimmer). Share them as `components/skeletons.tsx`.

### 8.2 Feedback and forgiveness

- One **toast** system (bottom-centre, a material surface) for completion feedback and **Undo**: to-do done or deleted, announcement read, assignment status, notes saved, course moved on the board.
- **Optimistic updates** for every one-field Server Action form (to-dos, flags, progress), so the UI changes on press.

### 8.3 Type scale

The app leans on `text-xs` (12 px) for real content: calendar entries, swap details, announcement excerpts, requirement courses, graph titles. For a daily tool that's too small.

- Content minimum: **13 px** (`text-[0.8125rem]` → add a named `text-footnote` token). Keep 12 px for metadata only (counts, timestamps).
- Uppercase eyebrows and section labels ("WHY CONSIDER IT", "NEXT EXAM", table headers) are used in many places. Apple uses them sparingly. Keep them for page eyebrows and use sentence-case `text-headline` for in-card headings.

### 8.4 Motion

- **Page transitions:** enable the View Transitions API (Next's `experimental.viewTransition`) for a quick cross-fade between tabs, plus a shared-element morph from a Courses card to the course page header. Make it a plain fade under reduced motion.
- **List changes animate:** to-dos completing, announcements marked read, and items moving on the board use `motion`'s `layout` with the existing critically damped spring.
- **Progress rings** draw in on the first visit only (sessionStorage flag). Redrawing every time you open the page starts to feel slow.

### 8.5 Mobile

- Bottom tab bar (§2.1).
- **Dialogs become bottom sheets** under `sm`, with drag-to-dismiss: track the finger 1:1, project the release velocity to decide whether to close, and rubber-band past the top. Vaul does this. Use a damping 0.8 spring only after a flick.
- **Swipe actions** on to-dos and announcements (complete / mark read), with the delete button kept for pointer users.
- Horizontal boards (pathway, graph) get **edge fades** (a mask gradient) so it's clear there's more to the side.

---

## Suggested order

1. **Quick fixes** (§0) plus skeletons (§8.1). These are small, independent commits.
2. **Colour pass** (§1.1–1.4), with measurements recorded in `decisions.md`.
3. **Navigation** (§2.1–2.3), with the Courses index, since it changes every page's frame.
4. **Today rebuild** (§3) and the **calendar time grid** (§4.1), the two daily-use pages.
5. **Pathway interaction** (§5.1–5.3), then Requirements, Swaps, Graph and Plans (§5.4–5.7).
6. **Course page** (§6), **Settings** (§7), then toasts and optimistic updates (§8.2) and motion (§8.4).
7. **Mobile** (§8.5): bottom sheets and swipe actions, once the structure has settled.
