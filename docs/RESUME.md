# Resume This Project — Orientation for a Fresh Claude Code Session

If you're a Claude Code session being asked to continue this build, read this
file first, then `docs/PLAN.md`, then skim the latest commit log.

## Where things stand

Phase 1 of the Summer Meadows HOA portal is complete:

- **M1 — Scaffold + Supabase wiring** ✅
- **M2 — Schema migrations + RLS policies** ✅
- **M3 — Auth + member self-view (`/me`)** ✅
- **M4 — Lot CRUD + invite flow** ✅

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
- Providers → Email: enable magic link, **disable signups** (invite-only)
- URL Configuration → Site URL: production URL (or `http://localhost:3000` for now)
- URL Configuration → Redirect URLs allowlist: add `http://localhost:3000/auth/callback` and the production callback

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
