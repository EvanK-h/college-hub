# College Hub

A private, single-user web app for Evan Khosh (Northeastern CS BS, AI concentration + Physics minor; London Scholars 2026–27, then Boston). It combines a four-year degree planner with a live dashboard of Canvas classes, assignments, grades, announcements and the class timetable. It replaces two Notion pages (Course Pathway and Canvas Hub).

This is a daily tool and a portfolio project. The focus is on building it: shipping working features with good code quality, readable history and clear decisions.

Full spec (architecture, schema, sync design, phase checklists): [`college-hub-spec.md`](college-hub-spec.md)

## How to work with me

- Build features end to end: carry a task through from migration to UI without stopping after each piece, and verify it works (lint, typecheck, tests) before handing back.
- Pause for my input only on real design decisions or changes that are hard to reverse.
- If something in this file or the spec looks wrong, say so rather than working around it.
- When we make a real design decision, add a dated entry to `docs/decisions.md`.

## Stack

- Next.js (App Router) + TypeScript (strict), React Server Components by default
- Tailwind CSS + shadcn/ui (warm, cozy palette as CSS variables; dark mode supported)
- Supabase: Postgres, Auth (magic link), `pg_cron` + `pg_net`; local dev via the Supabase CLI
- Vercel (Hobby plan) for hosting and a daily cron
- Zod for validating Canvas responses and form input
- `node-ical` for the Outlook/Celcat timetable feed
- Vitest for unit tests, Playwright for end-to-end tests

## Commands

```bash
npm run dev                         # Next.js dev server
supabase start                      # local Postgres + Auth (needs Docker)
supabase migration new <name>       # new SQL migration in supabase/migrations
supabase db reset                   # rebuild local DB from migrations + seed
supabase gen types typescript --local > lib/database.types.ts
npm test                            # Vitest
npx playwright test                 # end-to-end
npm run lint && npm run typecheck   # run both before every commit
```

## Layout

```
app/
  (auth)/login/            magic-link sign-in
  (app)/page.tsx           dashboard
  (app)/courses/[code]/    course page + grade calculator
  (app)/pathway/           plan, requirements/, swaps/
  (app)/calendar/
  (app)/settings/          sync status, Canvas ID mapping, feed link
  api/sync/all/route.ts    the only entry point to the Canvas + timetable sync
  api/calendar/[token]/route.ts   personal ICS feed (text/calendar)
lib/
  supabase/server.ts       server client with the user's session (RLS applies)
  supabase/client.ts       browser client (anon key only)
  supabase/admin.ts        service-role client — sync jobs only
  supabase/anon.ts         anon key, no session — calendar feed route only
  canvas/                  client.ts, schemas.ts (Zod), sync.ts
  timetable/               ICS parsing + sync
  grades/                  grade calculator (pure functions)
  database.types.ts        generated — never edit by hand
supabase/migrations/       all schema changes, in order
scripts/import-notion.ts   one-off import of the Notion Course Pathway
docs/decisions.md          decision log
```

## Security rules (never break these)

- `CANVAS_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` and `OUTLOOK_ICS_URL` are server-only. Never prefix them with `NEXT_PUBLIC_`, never log them, never put them in code, tests, fixtures, comments or commit messages.
- Any module that reads those variables or calls Canvas starts with `import "server-only"`.
- Never read, print or edit `.env.local`. Use `.env.example` (names only, empty values) to document variables.
- `lib/supabase/admin.ts` (service role, bypasses RLS) is imported only by sync code under `app/api/sync` and `lib/canvas` / `lib/timetable`. Pages and server actions use `lib/supabase/server.ts`.
- `/api/sync/*` accepts only `Authorization: Bearer ${CRON_SECRET}` and rejects everything else, including a signed-in browser. The "Sync now" button is a Server Action that checks the session and calls `runCanvasSync()` directly, not the route.
- Every table has `owner_id uuid not null default auth.uid()`, RLS enabled, and a policy `owner_id = auth.uid()` in the same migration that creates it.
- Sign-in is restricted to `ALLOWED_EMAIL`; public sign-ups are off.
- The site only reads from Canvas. Never call a Canvas endpoint that creates, updates, submits or deletes anything.
- If I paste a secret into the chat by mistake, tell me to rotate it.

## Data rules

- Schema changes happen only through new files in `supabase/migrations/`. Never edit a migration that has already been applied; write a new one.
- Regenerate `lib/database.types.ts` after every migration.
- Derived values (requirement progress, "due in", year, effective status, weighted grades) are computed in SQL views or TypeScript — never stored.
- Closed sets are Postgres enums (course type, course status, NUpath code, requirement area, swap slot, quantum relevance, session type).
- Store times as `timestamptz` in UTC. Display in the term's `time_zone` (`Europe/London` for London terms, `America/New_York` from Fall 2027). Format day names and time ranges at display time.
- Import check: after importing from Notion there must be 56 courses, 171 SH total, 53 SH of transfer credit, 31 requirements and 32 swap options. Keep this as a test.

## Sync rules

- Upsert by `canvas_id` (Canvas) or ICS `UID` + `RECURRENCE-ID` (timetable; null for one-off events, see the 2026-10-27 decision). Re-running a sync must always be safe.
- Synced columns and user-owned columns are separate. The upsert's column list never includes `progress`, `priority`, `est_hours`, `notes`, `read`, `important` or a corrected `kind`. Keep a test proving a re-sync leaves them unchanged.
- Never delete rows that disappear upstream: set `deleted_in_canvas = true` or `cancelled = true`.
- Canvas client: `per_page=100`, follow the `Link` header's `rel="next"`, one request at a time, retry 429s with backoff (max 3), stop on 401 and record "token expired" in `sync_runs`.
- Validate every Canvas and ICS payload with Zod before writing to the database.
- Every run writes a `sync_runs` row (source, start, finish, status, counts, error message — never headers or tokens).
- The Canvas token expires every 30 days. A 401 must show a clear banner, not fail silently.

## Code conventions

- TypeScript strict; no `any` (use `unknown` + Zod). Named exports except where Next.js requires defaults.
- Server Components by default; add `"use client"` only for interactivity. Mutations go through Server Actions.
- Keep business logic (grades, requirement progress, plan validation) in pure functions under `lib/` with Vitest tests next to them.
- Use shadcn/ui components and Tailwind; colours come from CSS variables, never hard-coded hex in components.
- Colour roles are fixed in the spec's Visual design section: status hues (grey/blue/green/amber/red) are never used for categories, and wine is only for things you can act on. Check contrast and ΔE before adding a colour.
- Accessible by default: real buttons and links, labels on inputs, visible focus, sufficient contrast in both themes.

## Git

- Small commits, one change each, imperative messages ("Add requirement_progress view").
- Run lint, typecheck and tests before committing.
- Never commit `.env*` files other than `.env.example`, generated secrets, or real Canvas data in fixtures (use invented data).

## Current phase

Phase 3 — Dashboard, course pages and calendar (Phases 0, 1 and 2 are done). See the spec's Phases section for the checklist; update this line when a phase is done.
