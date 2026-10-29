# College Hub

A private, single-user web app for planning a degree and following the current term. It puts two things in one place:

- **A degree planner.** Every course from transfer credit to graduation on a drag-and-drop board that checks prerequisites, co-op terms and credit limits as you move things. It also has requirement progress rings, a prerequisite graph, swap options ranked by the direction you're leaning, and what-if plans you can compare and make active.
- **A live term dashboard.** Canvas assignments, grades (with a "what do I need on the rest?" calculator), announcements and to-dos, plus your class timetable from a calendar feed. It all comes together in a week agenda, a month calendar and a personal ICS feed.

It works for any school and major. Your degree is a folder of JSON files that you import once and then edit in the app. Northeastern students can add `"preset": "northeastern"`, which brings in NUpath, the university's grade scale, SH credit limits and catalogue prerequisites.

Built with Next.js (App Router, React Server Components), TypeScript, Tailwind and shadcn/ui, Supabase (Postgres with row-level security, magic-link auth) and Vercel. The design and the reasoning behind it are in [`college-hub-spec.md`](college-hub-spec.md) and [`docs/decisions.md`](docs/decisions.md).

## Make your own

You need Node 22 or later, Docker (for the local database) and the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started). Canvas and a calendar feed are optional; the planner works without them.

### 1. Run it locally with the example student

```bash
git clone <this repo> college-hub && cd college-hub
npm install
supabase start                                   # local Postgres + Auth; applies every migration
cp .env.example .env.local                       # then fill it in (see below)
npm run import -- data/example --email you@example.edu
npm run dev
```

Open http://localhost:3000 and sign in with that email. The magic link lands in the local inbox at http://localhost:54324. `data/example` is an invented biology student at an invented school, so you can try every page before writing your own data.

For local development, `.env.local` needs:

| Variable | Where it comes from |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | `supabase status` (API URL, anon key, service role key) |
| `ALLOWED_EMAIL` | The one email allowed to sign in |
| `OWNER_ID` | Your user id; `npm run import` prints it. The sync writes as this user. |
| `CRON_SECRET` | Any long random string, e.g. `openssl rand -hex 32` |
| `CANVAS_BASE_URL`, `CANVAS_TOKEN` | Optional. Your school's Canvas address and a token from Canvas → Account → Settings → New access token |
| `OUTLOOK_ICS_URL` | Optional. A published calendar (ICS) link with your class timetable |

Everything except the two `NEXT_PUBLIC_` values is server-only. Never commit `.env.local`.

### 2. Write your own data folder

```bash
cp -r data/example data/mine                     # data/* is gitignored, apart from data/example
npm run import -- data/mine --check              # validates every file and prints the totals
npm run import -- data/mine --email you@example.edu
```

A data folder has six JSON files. Only the first three are required:

| File | What it holds |
| --- | --- |
| `profile.json` | `preset`, `school`, `creditUnit` ("credits", "SH"…), `timeZone` (the default for terms), `attributeSetName` (e.g. "Gen Ed"; omit it to hide that ring), `gradeScale` (`[[93, "A"], [90, "A−"], …]`, best first), `creditLimits` (`{"semester": 18, "summer": 12}`). Also your categories: `courseTypes` (name, `color` 1–6, `coop: true` for co-op or internship placeholders), `areas` (requirement areas, `headline: true` to put one at the top), `slots` (groups of swap options), `attributes` (codes a degree asks you to collect) and `focuses` (directions you're weighing, with an optional `goal` course). |
| `terms.json` | Terms in order, first to last: `name`, `kind` (`transfer`, `semester`, `summer`, `coop`), optional `timeZone`, `campus`, `startsOn`, `endsOn` |
| `courses.json` | `code`, `title`, `credits`, `type`, `status` (`planned`, `in_progress`, `done`), `term`, optional `attributes` and `notes` |
| `requirements.json` | `name`, `area`, the `courses` that fill it, optional `options` and `notes` |
| `swaps.json` | `swapIn` (e.g. "BIOL 4500 · Developmental Biology"), `slot`, the courses it `replaces`, `relevance` per focus (`none` … `high`), optional `fitsIn`, `prerequisites`, `whyConsider`, `whyCurrentBetter` |
| `prereqs.json` | `course` with `prereq`, `coreq` and `recommended`, each a list of OR-groups that must all be met: `[["CS 2100", "CS 2510"], ["CS 1800"]]` means (CS 2100 or CS 2510) and CS 1800 |

Rows refer to categories and terms by name and to courses by code, and the import names the file and place of anything that doesn't match. Re-importing updates rows in place and never deletes anything. Once you edit in the app, `npm run export -- data/mine --email you@example.edu` writes the database back out to the folder.

**Northeastern students:** start `profile.json` with `"preset": "northeastern"` and leave out `creditUnit`, `gradeScale`, `creditLimits`, `attributeSetName` and `attributes`. You get SH, the registrar's grade scale, 18 SH a semester and 9 a summer term, the 13 NUpath attributes, and catalogue prerequisites for the courses you list (your own `prereqs.json` entries override them). Anything you do set yourself wins.

### 3. Connect Canvas and your timetable (optional)

With `CANVAS_TOKEN` set, open **Settings** and match each course to its Canvas course id, then press **Sync now**. The site only reads from Canvas. Tokens often expire after 30 days; the dashboard shows a banner when yours has.

The timetable sync reads `OUTLOOK_ICS_URL` and matches events to courses by the code in the event title ("CS 2100" or "CS2100").

### 4. Deploy

1. Create a Supabase project, then `supabase link` and `supabase db push`. In Auth settings, turn off sign-ups and add `https://<your-site>/auth/callback` to the redirect URLs.
2. Import your folder into it. `--remote` reads the project's URL and service role key from `.env.local` and asks before writing: `npm run import -- data/mine --remote`.
3. Import the repo into Vercel and set the environment variables above, using the hosted project's keys and your hosted user id as `OWNER_ID`. `vercel.json` schedules the daily sync.
4. Vercel's Hobby plan only runs that cron once a day, so the database also triggers the sync every two hours (`pg_cron`). It needs your site's address and the same `CRON_SECRET`, kept in Supabase Vault rather than in a migration. Run this once in the hosted project's SQL editor:

   ```sql
   select vault.create_secret('https://<your-site>', 'sync_app_url');
   select vault.create_secret('<your CRON_SECRET>', 'sync_cron_secret');
   ```

   Until both exist the scheduled job does nothing, so the local database stays quiet.

## Development

```bash
npm test                            # Vitest: unit tests, plus database tests when `supabase start` is running
npm run test:e2e                    # Playwright, against a production build on :3100 and an invented user
npm run lint && npm run typecheck
supabase migration new <name>       # schema changes only through new migrations
supabase gen types typescript --local > lib/database.types.ts
```

`CLAUDE.md` holds the project's working rules (security, data and sync rules, code conventions).

## License

[MIT](LICENSE)
