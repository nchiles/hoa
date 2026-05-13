# Summer Meadows HOA Portal — Phase 1 Plan

> See `docs/PRD.md` for the full product requirements. This document tracks
> Phase 1 (foundation) only. Phases 2–4 are scoped in PRD §10.

## Context

The board of Summer Meadows HOA (~43–44 lots, Grand Rapids MI) needs a web portal that lets the board manage dues/expenditures/bylaws and lets homeowners self-serve answers to "did my payment go through?" and "what is money being spent on?". This branch (`claude/hoa-portal-build-xSABi`) carries the Phase 1 build.

## Decisions confirmed

- **Auth provider:** Supabase Auth (magic links + MFA, same JWT as the DB for RLS)
- **Homeowner onboarding:** invite-only — board adds homeowner email to their lot record, Supabase sends a magic-link invite
- **Payments:** Stripe online + offline mix planned for Phase 4 — Phase 1 schema reserves `stripe_payment_id` but ships no Stripe code
- **Cadence:** milestone reviews — pause after each milestone for user approval before continuing

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 App Router + TypeScript, `src/` dir, `@/*` import alias |
| Styling | Tailwind CSS |
| Auth + DB | Supabase (Postgres, Auth, RLS) via `@supabase/ssr` |
| Validation | Zod |
| Deploy | Vercel |

## Milestones

### M1 — Scaffold + Supabase wiring ✅ DONE

- `npx create-next-app@latest . --typescript --tailwind --app --eslint --src-dir --import-alias "@/*" --no-turbopack`
- `npm i @supabase/supabase-js @supabase/ssr zod server-only` and `npm i -D supabase`
- `npx supabase init`
- `.env.local` + `.env.example` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `/`, `/login`, `/privacy` placeholder pages render
- Supabase clients: `src/lib/supabase/{server,client,admin,middleware}.ts`
- `src/middleware.ts` refreshes the session on every request (route guards land in M3)

### M2 — Schema + RLS ✅ DONE

Migrations in `supabase/migrations/`:

- `20260512000000_init_schema.sql` — `profiles`, `lots`, `dues_payments` (with `stripe_payment_id` reserved), `expenditures`, `bylaws_versions`. `citext` for emails, `gen_random_uuid()` PKs, `unique(lot_id, year)` on dues, partial unique index enforcing one `is_current` bylaws version.
- `20260512000100_rls_helpers.sql` — `handle_new_user()` trigger auto-creates a `profiles` row on signup and links `lot_id` by case-insensitive email match; `is_board()` and `my_lot_id()` SECURITY DEFINER helpers.
- `20260512000200_rls_policies.sql` — RLS enabled on every table. Board: full access. Member: SELECT only on `lots` and `dues_payments` rows where `lot_id = my_lot_id()`. Authenticated users can read aggregate expenditures and the current bylaws version.

**Validated locally against a Postgres 16 cluster:** trigger fires, email matching links the right lot, partial unique index rejects a second `is_current = true` bylaw, member RLS blocks cross-reads and INSERTs, board RLS allows everything.

### M3 — Auth + member view ✅ DONE

- Magic-link sign in at `/login` (server action with `shouldCreateUser: false` so it stays invite-only)
- `/auth/callback` exchanges the OAuth code and redirects by role (`/dashboard` for board, `/me` for member)
- `/auth/signout` POST handler
- Middleware adds route guards: unauthenticated → `/login`; member on board route → `/me`
- `/me` shows the signed-in member's lot + current-year dues + payment history, with graceful fallbacks for "no profile" and "no lot linked"
- `/` redirects authenticated visitors to their role-appropriate landing page
- Manual board bootstrap remains: `update profiles set role='board' where email='...'`

### M4 — Lot CRUD + invite flow ✅ DONE

- `src/app/(board)/layout.tsx` — shared nav + `requireBoard()` guard for every board page
- `src/lib/auth/requireRole.ts` — `requireBoard()` and `requireAuth()` server helpers
- `src/lib/validators/lot.ts` — Zod schema with empty-string-to-null coercion
- `/lots` — table view with search (lot_number / address / owner_name via ilike)
- `/lots/new` and `/lots/[id]/edit` — shared `LotForm` component, server-action submit, error display via `?error=` query
- `/lots/[id]` — detail with dues history, link to edit, link to invite
- **Offboard action** on edit page — nulls owner_name/email/phone/notes, unlinks any profiles, preserves dues_payments
- `/admin/invite` — table of every lot with an owner email; per-row status (`Not invited` / `Invited` / `Active`) sourced from `auth.admin.listUsers`; "Send invite" / "Resend link" button per row
- Invite action: `auth.admin.inviteUserByEmail` for new users; falls back to `signInWithOtp` for already-registered users (true resend)
- Graceful degradation when `SUPABASE_SERVICE_ROLE_KEY` is missing: page still loads with a banner, action returns a clear error

Remaining for Phase 1 close-out (small):
- Push migrations to the cloud Supabase project (`npx supabase db push`) if not already done
- Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` so the invite flow works end-to-end
- Vercel preview deploy
- Final privacy notice copy (current placeholder is acceptable for v1)

## Critical files

- `src/middleware.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/admin.ts` (service-role, never imported client-side)
- `src/lib/auth/requireRole.ts` (M4)
- `src/lib/validators/lot.ts` (M4)
- `supabase/migrations/20260512000000_init_schema.sql`
- `supabase/migrations/20260512000100_rls_helpers.sql`
- `supabase/migrations/20260512000200_rls_policies.sql`
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/auth/callback/route.ts` (M3)
- `src/app/(board)/lots/[id]/page.tsx` (M4)
- `src/app/(board)/admin/invite/page.tsx` (M4)
- `src/app/(member)/me/page.tsx` (M3)
- `src/app/privacy/page.tsx`

## Security non-negotiables (per PRD §2 and §6)

- RLS enabled on every table, not relying on UI checks
- Service-role key only in `src/lib/supabase/admin.ts`, never imported into client code; `.env*` gitignored except `.env.example`
- Email signups disabled in Supabase dashboard (invite-only flow)
- Privacy notice page live and linked from footer before M4 ends
- No third-party analytics or tracking pixels
- HTTPS via Vercel default; site URL + allowed redirects locked down in Supabase Auth config
- Offboarding clears PII but never deletes payment history

## Verification (end-to-end)

1. `npx supabase start && npx supabase db reset` (local) or `npx supabase db push` (cloud) — migrations apply cleanly.
2. `npm run dev`. Visit `/login`, submit a board email, grab magic link from Inbucket (`http://127.0.0.1:54324`) locally or from the inbox on the cloud project.
3. First login lands on `/me` as a member. Flip role to `board` via psql / dashboard SQL editor; refresh → routed to `/dashboard`.
4. As board, create a lot with `owner_email=alice@example.com`, send invite. Open Alice's magic link in a private window.
5. Confirm Alice's `/me` shows her lot only; `/lots` redirects/404s; SQL editor as Alice's JWT can only `SELECT` her own row.
6. Click "Offboard" on Alice's lot → PII columns null out, `dues_payments` rows remain.
7. Push migrations to remote Supabase project, deploy to Vercel preview, repeat steps 2–6 against the hosted env.

## Open items still owed by the board

- Final lot count (43 vs 44) and a CSV/list to seed `lots`, or confirmation that the board will enter them one at a time in the UI
- Annual dues amount and fiscal year start date — needed before seeding `dues_payments` rows
- Existing homeowner email roster — affects whether M4 needs a CSV importer
- Bootstrap board email(s) to flip to `role='board'` post-deploy
- Domain registration owner (for `summermeadowshoa.com` and Supabase prod redirect URLs)
- MFA scope: enforce for all board members in Phase 1, or ship enrollment page and defer enforcement?

## Out of scope for Phase 1

Map (Phase 2), expenditure UI (Phase 2), financial dashboard charts (Phase 2), bylaws editor (Phase 3), PDF export (Phase 3), Stripe integration (Phase 4), receipt uploads to Supabase Storage (Phase 2 with expenditures).
