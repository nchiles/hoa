# Signup & Board Approval Model

> Agreed design for self-service homeowner signup with board approval.
> Supersedes the email-match confirmation step. Built in 3 staged PRs.

## Trust model (why this is fine)

The founding board president is already self-asserted (a checkbox on
`/signup` when no HOA exists). So gating later homeowners behind board
approval is the *same* trust shape — self-asserted bootstrap, then the
board vouches for everyone after. This is not weaker than today.

## Signup decision tree

User enters their street address →

- **Address matches a lot** (any HOA; claimed or not):
  > "This lot is part of the {HOA name} HOA. Continue to claim it — your
  > request will be sent to the board for approval."

  They enter email → account created **pending**, linked to that lot →
  holding screen until a board member approves or rejects.

  "Claimed-ness" never blocks the user. It only annotates the board's
  approval queue: if a profile is already linked to the lot, the queue
  shows **"⚠ another resident is already linked to this lot"** so the
  board adjudicates (sale, rental, error) instead of the app hard-blocking.

- **No address match → "Are you on the board?"**
  - **Yes** → founding/board path (create HOA if none, then add lots — as
    today, unchanged).
  - **No** → dead-end with a **share-the-app affordance**: copy-link
    button + "email the board" button. Their lot isn't in the system;
    only the board can add it.

The current "enter the exact email the board has on file" step is
**removed** — board approval replaces it.

## Data model

`profiles` gains:

- `status text not null default 'active'
   check (status in ('active','pending','rejected'))`

Existing rows and all board accounts default to `active`. A homeowner who
self-signs-up via address match is created `pending`. Board approval flips
to `active`; rejection flips to `rejected` (kept, not deleted, for an
audit trail and to stop immediate re-signup loops).

Lot linkage: the signup flow knows the matched lot at form time, so the
intended `lot_id` is passed via auth user metadata and applied when the
profile row is created (replacing reliance on `owner_email` matching).
`relink_my_lot()` stays for the board-entered-email case.

## Staging

- **PR 1 — pending infrastructure.** `profiles.status` migration; RLS so a
  `pending` profile can read nothing (not even its own lot); `/pending`
  holding screen; route guards send pending users there. Seeding pending
  rows comes in PR 3, so PR 1 is verified by manually setting a row to
  `pending` in testing.
- **PR 2 — board approval queue.** `/admin/approvals`: list pending
  profiles with the lot they want, the dispute warning when the lot is
  already linked, and approve / reject actions (board-only, RLS-guarded).
- **PR 3 — signup rewrite.** Address-match → create `pending` + link lot
  via metadata; remove the email-confirmation step; add the
  share-the-app affordance (copy link + email button) to the no-match,
  not-board dead-end; reword copy per the tree above.

## Open/deferred

- Map-based board lot-seeding (click parcels to add lots) is a **board
  tool**, folded into Phase 2 once Kent County parcel data is sourced.
  Not part of this signup work.
