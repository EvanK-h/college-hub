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

