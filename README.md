# Summer Meadows HOA Portal

Member and board portal for the Summer Meadows HOA (Grand Rapids, MI). See the PRD for the full product specification.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- Supabase (Postgres, Auth, Storage) via `@supabase/ssr`
- Zod for validation
- Vercel deploy target

## Setup

```bash
npm install
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# and SUPABASE_SERVICE_ROLE_KEY from `npx supabase start` output
# (local) or the Supabase dashboard (production).
npm run dev
```

Open http://localhost:3000.

## Local Supabase stack

```bash
npx supabase start            # Boots Postgres, Auth, Studio, Inbucket
npx supabase db reset         # Applies all migrations from scratch
npx supabase stop             # Stop containers
```

Inbucket (local email inbox) is at http://127.0.0.1:54324 — magic-link emails land there during local dev.

## Project structure

```
src/
  app/
    (auth)/login/          Magic-link sign in (M3)
    (auth)/auth/callback   Supabase code exchange (M3)
    (board)/               Board-only routes (M3+)
    (member)/me/           Homeowner self-view (M3)
    privacy/               Privacy notice
  lib/
    supabase/server.ts     Server-side Supabase client
    supabase/client.ts     Browser Supabase client
    supabase/admin.ts      Service-role client, server-only
    supabase/middleware.ts Session refresh helper
  middleware.ts            Next.js middleware entry
supabase/
  config.toml
  migrations/              SQL schema + RLS (M2)
```

## Milestones

- **M1** — Scaffold + Supabase wiring (current)
- **M2** — Schema migrations + RLS policies
- **M3** — Auth + member self-view
- **M4** — Lot CRUD + board invite flow + Vercel preview deploy

Each milestone ends with a review pause.
