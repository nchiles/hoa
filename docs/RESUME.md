# Resume This Project — Orientation for a Fresh Claude Code Session

If you're a Claude Code session being asked to continue this build, read this
file first, then `docs/PLAN.md`, then skim the latest commit log.

## Where things stand

Phase 1 of the Summer Meadows HOA portal is complete:

- **M1 — Scaffold + Supabase wiring** ✅
- **M2 — Schema migrations + RLS policies** ✅
- **M3 — Auth + member self-view (`/me`)** ✅
- **M4 — Lot CRUD + invite flow** ✅
- **M5 — Bootstrap & onboarding** ✅ (env-var founding board, HOA settings, CSV lot import, board-member invites, dashboard checklist)

Phase 1 close-out remaining (small):
- Vercel preview deploy
- Optional: tighten privacy notice copy

Phase 2 (per PRD §10) is next: SVG neighborhood map, lot detail panel
clickthrough, expenditure tracker, financial dashboard charts.

Confirmed decisions (PRD §9):

- Auth: **Supabase Auth**, magic links, MFA available
- Onboarding: **invite-only** (board enters lot + email, Supabase emails a magic link)
- Payments: **Stripe + offline mix** planned for Phase 4 — Phase 1 schema reserves `stripe_payment_id` but no Stripe code yet
- Cadence: **milestone reviews** — pause for user approval after each milestone before continuing

## Working agreement (important)

- Stop at the end of each milestone, summarize what was done, and wait for
  user approval before starting the next one. Do NOT chain milestones.
- Real Supabase credentials live in the user's local `.env.local` (gitignored).
  `.env.example` shows the keys needed.
- This repo is on branch `claude/hoa-portal-build-xSABi`. Push there.

## Local setup (one-time)

```bash
git checkout claude/hoa-portal-build-xSABi
npm install
cp .env.example .env.local
# Fill .env.local with values from the Supabase dashboard
# (Project Settings → API): NEXT_PUBLIC_SUPABASE_URL,
# NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY
```

Push the M2 migrations to the cloud project (once, if not already done):

```bash
npx supabase login
npx supabase link --project-ref klonqpznybgnysgyecao
npx supabase db push
```

Then in **Supabase Dashboard → Authentication**:
- Providers → Email: enable magic link. **Sign In / Providers → "Allow new
  users to sign up" MUST be ON.** This is non-obvious and was a real blocker:
  if it's off, `signInWithOtp({ shouldCreateUser: true })` fails and the
  `/signup` president/homeowner paths silently do nothing useful. App-level
  gating still keeps it invite-only — `shouldCreateUser` is `false`
  everywhere except the address-matched homeowner path and the founding-
  president path.
- URL Configuration → Site URL: production URL (or `http://localhost:3000` for now)
- URL Configuration → Redirect URLs allowlist: add `http://localhost:3000/auth/callback` and the production callback

Founding-board bootstrap (replaces the old `update profiles set role='board'`
SQL step): the `/signup` flow handles it. A visitor enters their address; if
it doesn't match any lot AND no board exists yet, they get an "Are you the
president?" prompt with an attestation checkbox. On submit, a magic link is
sent and the `handle_new_user()` trigger assigns `role='board'` to that
first account. After that, the bootstrap branch is no longer offered and
new accounts come via lot-matched homeowner signup or board invites.

## How to run locally

```bash
npm run dev          # → http://localhost:3000
npm run build        # production build / typecheck
npm run lint         # eslint
```

To validate migrations end-to-end against a local stack (needs Docker):

```bash
npx supabase start                  # boots Postgres + Auth + Studio + Inbucket
npx supabase db reset               # applies all migrations from scratch
# Magic-link emails arrive at http://127.0.0.1:54324
npx supabase stop
```

## Deploying to Vercel

One-time setup:

1. Import the repo in Vercel. Framework preset auto-detects as Next.js.
2. **Environment Variables** (Project Settings → Environment Variables — set
   for Production and Preview):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY` (server-only — Vercel does not expose vars without
     the `NEXT_PUBLIC_` prefix to the browser)
3. **Build & Output Settings:** leave defaults. `npm run build` produces a
   standard Next.js 15 App Router build.
4. After the first deploy, go to **Supabase Dashboard → Authentication → URL
   Configuration** and add the Vercel URLs:
   - Site URL → the production domain
   - Redirect URLs allowlist → `https://<your-domain>/auth/callback` plus the
     same for any preview domain you intend to test against
5. Run `npx supabase db push` from a local checkout (with `.env.local`
   pointed at the cloud project) before the first user signs up so the
   migrations exist on the cloud DB.

Preview deploys: every push to a branch gets its own URL. Add each preview
URL's `/auth/callback` to the Supabase redirect allowlist as needed, or use
Supabase's wildcard redirect feature (`https://*.vercel.app/auth/callback`)
in the dashboard.

## Where to look in the code

- `src/lib/supabase/server.ts` — server-component Supabase client (uses `cookies()`)
- `src/lib/supabase/client.ts` — browser client
- `src/lib/supabase/admin.ts` — service-role client, **server-only** (used by M4 invite flow)
- `src/lib/supabase/middleware.ts` — session-refresh helper called from `src/middleware.ts`
- `supabase/migrations/` — schema, helpers, and RLS policies (apply in filename order)

The PRD is at `docs/PRD.md`. The full Phase 1 plan with M3 and M4 task lists
is at `docs/PLAN.md`.

## What to do first when resuming

1. `git pull` to make sure you have the latest commits.
2. `npm install` and `npm run build` to confirm the project still compiles.
3. Read `docs/PLAN.md` § M3 for the next milestone's task list.
4. Ask the user which milestone they want to start, then proceed.
5. End-of-milestone: commit + push + stop, wait for review.
