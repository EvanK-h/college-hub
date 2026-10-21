# College Hub

A private, single-user web app for Evan Khosh (Northeastern CS BS, AI concentration + Physics minor; London Scholars 2026–27, then Boston). It combines a four-year degree planner with a live dashboard of Canvas classes, assignments, grades, announcements and the class timetable. It replaces two Notion pages (Course Pathway and Canvas Hub).

This is a **learning and portfolio project** as well as a daily tool. Code quality, readable history and clear decisions matter as much as features.

Full spec (architecture, schema, sync design, phase checklists): [`college-hub-spec.md`](college-hub-spec.md)

## How to work with me

- I'm learning this stack. When you introduce a concept I probably haven't used (RLS policies, Server Actions, upserts, cron auth, Zod), explain it in two or three sentences before or after the code.
- Work in small steps: one migration, one route or one component at a time, then stop so I can run it and read it.
- For the core learning pieces — the schema, the Canvas client, the sync upsert and the grade calculator — propose the approach first and wait for my go-ahead before writing it all.
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
- `/api/sync/*` must reject requests without `Authorization: Bearer ${CRON_SECRET}` or a signed-in session.
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
- Import check: after importing from Notion there must be 56 courses, 171 SH total, 53 SH of transfer credit, 31 requirements and 31 swap options. Keep this as a test.

## Sync rules

- Upsert by `canvas_id` (Canvas) or ICS `UID` + start time (timetable). Re-running a sync must always be safe.
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
- Accessible by default: real buttons and links, labels on inputs, visible focus, sufficient contrast in both themes.

## Git

- Small commits, one change each, imperative messages ("Add requirement_progress view").
- Run lint, typecheck and tests before committing.
- Never commit `.env*` files other than `.env.example`, generated secrets, or real Canvas data in fixtures (use invented data).

## Current phase

Phase 0 — setup. See the spec's Phases section for the checklist; update this line when a phase is done.
