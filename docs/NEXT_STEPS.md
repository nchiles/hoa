# Next Steps

> Captured at the end of Phase 1 close-out (post-M5). When picking this work
> back up, read `docs/RESUME.md` first for orientation, then this file for
> the prioritized backlog.

## Where things stand

- Phase 1 (M1–M5) is merged on `main`. PRs #1, #2, #3 all landed.
- No deploy to Vercel yet. The schema is local-tested but has not been
  pushed to the cloud Supabase project.
- Repo is clean: single branch (`main`), no worktrees, no stale refs.

## Priority order

### 1. Production verification of Phase 1 (gating)

Until this works in a real environment, all further code is theoretical.

- `npx supabase link --project-ref klonqpznybgnysgyecao`
- `npx supabase db push` — applies the M5 migration to the cloud DB.
- Create the Vercel project pointing at this repo. Env vars
  (Production + Preview): `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`.
- **Supabase Dashboard → Authentication**:
  - Email Provider: enable magic link, **enable signups** (gating is
    app-level via `/signup`).
  - URL Configuration: Site URL = Vercel prod URL; Redirect URL allowlist
    = `https://<prod>/auth/callback` plus a wildcard
    `https://*.vercel.app/auth/callback` for previews.
- Walk the flow:
  1. `/signup` → claim the founding board account (no-match → "Are you
     the president?" branch).
  2. `/admin/settings` → fill HOA info.
  3. `/lots/import` → upload a real 43-row CSV.
  4. `/admin/invite` → invite a second board member; sign in via private
     window, confirm they land on `/dashboard` as board.
  5. Invite a few homeowners via the existing per-lot invite UI.
- Anything that breaks here becomes the next PR.

### 2. Phase 2 prep — decide the map data source

Biggest unknown for Phase 2. Decide before the next coding session:

- **Kent County GIS parcel export** for Summer Meadows. Most accurate;
  roughly 1 hr of GIS-to-SVG work. Source: <https://accesskent.com/GIS>.
- **Hand-drawn SVG approximation** in Figma / Illustrator. Faster; "good
  enough" for at-a-glance use.
- **Placeholder grid** — 43 numbered tiles in a grid, no real layout.
  Lowest effort; replace later.

The map is Phase 2's visual centerpiece. Without it Phase 2 collapses to
an expenditure tracker + charts, which I can still build but is less of
an unlock.

### 3. Phase 2 build order

Regardless of which map data path you pick:

1. **Expenditure tracker CRUD** + Supabase Storage for receipts.
   (~half a session.)
2. **Member financial dashboard** — balance card, progress ring, spending
   breakdown chart. Depends on #1 + dues seeding.
3. **SVG map** + click-to-open lot detail panel. Depends on the map data
   decision in §2.
4. **Auto-seed `dues_payments`** on CSV import using
   `hoa_settings.default_dues_amount_cents`, so the dashboard stats
   aren't always 0/0. Small but worth doing before #2.

### 4. Track-but-don't-block (small, interleave)

- **Dependabot alert**: 1 moderate on default branch —
  <https://github.com/nchiles/hoa/security/dependabot/1>.
- **Fuzzy address matching** in `/signup` (typos, "Ln" vs "Lane") via
  `pg_trgm` or similarity scoring. Worth doing once real addresses
  start failing the exact-after-normalize match.
- **CSV header aliases** — current parser is strict on column names.
  An older parallel M5 attempt had a nice alias map ("Lot #" →
  `lot_number`, "Email" → `owner_email`, etc.) — port if real
  spreadsheets vary.
- **Rename default branch from `claude/hoa-portal-build-xSABi`** —
  already done; renamed to `main` post-Phase-1.

## Recommended sequence

Do **#1** this week (mostly clicking through a deploy, 45–60 min).
Decide **#2** before the next coding session — that's the input I need.
Then pick up **#3** when you're back.
