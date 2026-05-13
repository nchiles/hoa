# Product Requirements Document

## Summer Meadows HOA — Member & Board Portal

**Grand Rapids, MI | ~43–44 Lots**
**Version 1.1 | May 2026**

---

## 1. Purpose & Goals

Build a web-based HOA management portal with two distinct access tiers:

- **Board View** — Full CRUD over dues, expenditures, lot data, and bylaws
- **Member View** — Read-only transparency dashboard: balance, spending, payment status, bylaws

Primary success criteria:

- Board can manage all financial and member data from one place
- Members can self-serve answers to "did my payment go through?" and "what is money being spent on?"
- PII is protected and payment data is never stored on the app's own servers
- Bylaws are always current and accessible

---

## 2. PII & Payment Compliance (Resolve Before Build)

These are not implementation details — they are architectural decisions that affect every other technical choice.

### 2.1 PII Scope

The app will handle:

- Homeowner names
- Property addresses (lot numbers)
- Email addresses
- Payment history (paid/unpaid, amount, date)
- Possibly phone numbers

**Sensitivity assessment:**

- Names + addresses: low — mostly public record via Kent County
- Email addresses: moderate — direct contact info
- Payment history: moderate-high — financial behavior data

**Legal landscape:**
Michigan has no broad consumer privacy law. HOAs are not HIPAA-covered. This app operates primarily under HOA bylaws and membership agreements, not state statute. No hard compliance framework is mandated at this scale — but the board is a fiduciary and "we had no policy" is a bad outcome if something goes wrong.

**Decisions required:**

| Decision | Options | Recommendation |
|---|---|---|
| Auth provider | Firebase Auth, Supabase Auth, Clerk, Auth0 | **Clerk or Supabase** — simple setup, MFA included |
| Database host | Firebase Firestore, Supabase Postgres, PlanetScale | **Supabase** — Postgres, row-level security (RLS), open source |
| Who can see PII | Board only, or members see their own | Members see only their own record; board sees all |
| Data retention policy | Define before launch | Annual purge/anonymize of departed homeowners |
| Privacy notice | Required | Plain-English notice linked in footer before launch |

**Minimum PII controls to implement:**

- Row-Level Security (RLS) on all homeowner records — enforced server-side, not just in UI
- Board role gated via custom claims in auth token
- No PII in URL params or query strings
- HTTPS enforced (Vercel handles this automatically)
- No third-party analytics that capture PII — use Plausible if analytics are needed, or skip entirely
- Member-facing views show zero names — aggregate data only (e.g., "31 of 43 paid," not which 31)

**Homeowner offboarding (property transfer):**
When a lot sells, the board should "reset" that lot record: clear owner PII (name, email, phone), preserve lot-level payment history as anonymized records. Build this as an explicit board action, not a delete.

### 2.2 What to Build for Compliance

Minimal but defensible at this scale:

1. **Privacy notice page** — Plain English. "We store your name, address, email, and payment history. Board members can see all records. We don't sell your data. Contact [board email] to request changes or deletion." Link in footer.
2. **RLS on all Supabase tables** — Members can only query their own lot record at the database level.
3. **Lot reset / offboarding flow** — Board action to clear PII on ownership transfer.
4. **No third-party tracking** — No Google Analytics, no Meta Pixel.
5. **MFA available for board accounts** — Supabase Auth and Clerk both support this.
6. **Board resolution in meeting minutes** — Before launch, document the app's existence and purpose in HOA minutes. This is the paper trail that authorizes the board to maintain digital member records.

**What you don't need at this scale:**

- Cookie consent banner (no tracking cookies if you skip analytics)
- GDPR Data Processing Agreement
- SOC 2 certification
- A lawyer (unless bylaws are silent on digital record-keeping — see Section 4.5)

### 2.3 Payment Processing

The app must **never store payment card data**. Two options:

**Option A — Stripe (Recommended)**

- Stripe handles card data via Stripe Checkout or Payment Element
- App only stores: `stripe_payment_id`, `amount`, `date`, `status`
- Board manually marks dues as paid for cash/check/Zelle payments
- Stripe dashboard serves as the payment ledger for card transactions
- Cost: 2.9% + $0.30 per transaction (~$6.10 per $200 dues payment)
- Board can add a convenience fee to pass this cost to the payer

**Option B — Manual Only (No payment processing)**

- Board marks each lot as paid/unpaid manually
- No card data ever touches the app
- Simpler build, more board overhead
- Suitable if HOA collects dues by check or Zelle

**Decision required:** Does the board want members to pay online, or will dues always be collected offline?

If online payments are desired, Stripe is the only reasonable self-hosted option for a small HOA. Do not build custom payment flows.

---

## 3. Roles & Access

| Role | Access |
|---|---|
| **Board Member** | Full CRUD: lots, payments, expenditures, bylaws, member accounts |
| **Homeowner** | Read-only: their payment status, spending dashboard, bylaws |
| **Public** | None — all routes require login |

Board members are manually assigned their role by an admin in the database. No self-serve role escalation.

---

## 4. Feature Specifications

### 4.1 Interactive Neighborhood Map

**Purpose:** Visual at-a-glance view of payment status across all lots.

**Requirements:**

- SVG or canvas-based map of the Summer Meadows subdivision
- Each lot rendered as a polygon with address number label
- Color coding:
  - Green — dues paid, current year
  - Red — dues unpaid or overdue
  - Yellow — partial payment or payment pending
  - Gray — lot data not yet entered / vacant
- Clicking a lot opens a **Lot Detail Panel** (see 4.2)
- Board view: full lot detail + edit controls
- Member view: clicking their own lot shows their status; other lots show only paid/unpaid (no names)
- Map is static (not a live tile map like Google Maps) — drawn from lot boundary data

**Map data source:**
The lot boundary coordinates will need to be sourced from one of:

- Kent County GIS parcel data (public, available at accesskent.com/GIS)
- A simplified hand-drawn SVG approximation of the subdivision
- Exported from a tool like QGIS or Felt

**Recommendation:** Pull parcel data from Kent County GIS for Summer Meadows and convert to SVG polygons. This is a one-time setup step before Claude Code begins the map build.

---

### 4.2 Lot Detail Panel (Board View)

Triggered by clicking a lot on the map.

**Fields displayed:**

- Lot number / address
- Owner name
- Email address
- Phone (optional)
- Current year dues status (paid / unpaid / partial)
- Payment date (if paid)
- Payment method (check, Stripe, cash, Zelle)
- Payment reference / note
- Outstanding balance
- History of past payments (by year)
- Notes field (board-only, freeform)

**Actions (board only):**

- Edit owner info
- Mark as paid (manual)
- Record partial payment
- Add/edit notes
- View Stripe payment link (if enabled)

---

### 4.3 Expenditure Tracker

**Board CRUD:**

- Add expense: date, category, vendor, amount, description, receipt upload (optional)
- Edit / delete expense entries
- Categories (configurable): Landscaping, Insurance, Legal, Signage, Events, Reserves, Other

**Member view (read-only):**

- List of all expenses, sorted by date
- Category filter
- Running total per category
- Current reserve/balance display
- No edit controls visible

---

### 4.4 Financial Dashboard (Member View)

A public-facing (auth required) transparency page for members.

**Components:**

- **Balance card** — Current fund balance (manually updated by board)
- **Payment progress ring** — e.g., "31 of 43 homes paid" with a donut chart
- **Spending breakdown** — Pie or bar chart by category for current year
- **Recent transactions** — Last 10 expenditures (date, category, amount, description)
- **Year selector** — View prior years

No homeowner names appear on this view. Aggregate data only.

---

### 4.5 Bylaws

**Context:** The current Summer Meadows bylaws are expired. The board intends to draft new bylaws from scratch as part of this project. The app should support this authoring process and serve as the canonical home for the ratified document going forward.

**Bylaws should include language covering (at minimum):**

- Board authority to maintain digital member records (authorizes this app)
- Data handling and member privacy expectations
- Dues structure, due dates, and late payment policy
- Process for bylaw amendments

**App requirements:**

- Rendered as formatted, readable text (Markdown or rich text)
- Board can edit via a rich text editor (TipTap or similar)
- Version history: each save creates a timestamped snapshot with author
- Members can view current bylaws and download as PDF
- Board can restore a prior version
- Ratification date displayed prominently on the bylaws page

**Pre-launch dependency:** New bylaws should be drafted and ratified by the board before or at launch. A board resolution in meeting minutes documenting the app's authorization is also recommended even before bylaws are finalized.

---

### 4.6 Member Account (Self-Service)

Each homeowner can:

- Log in and view their lot detail (their own record only)
- See their payment history
- Update their email address
- Download a payment receipt (if Stripe is enabled)

---

### 4.7 Contact the Board

A simple, always-visible page or footer section for members to reach the HOA.

**Requirements:**

- Board contact email (e.g. `board@summermeadowshoa.com`)
- Optional: individual board member names and roles (President, Treasurer, Secretary) — board decides how much to expose
- Optional: a simple contact form that emails the board (no data stored — mailto or a serverless form handler like Resend or Formspree)
- Mailing address if the HOA has one
- Board manages this content via a simple settings page — no code changes needed to update it

**Email setup (no Google Workspace required):**

- Register domain (e.g. `summermeadowshoa.com`) — used for both the app and email
- Point DNS to Vercel for the app
- Use Cloudflare Email Routing (free) or ImprovMX (free tier) to forward `board@summermeadowshoa.com` to whatever Gmail the board uses
- Result: professional custom domain email address, $0/month

---

## 5. Technical Architecture

### Recommended Stack

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | Next.js (App Router) | SSR, auth middleware, API routes |
| Styling | Tailwind CSS | Fast, consistent, Claude Code-friendly |
| Auth | Supabase Auth or Clerk | RLS integration, MFA, email magic links |
| Database | Supabase Postgres | Row-level security, real-time, free tier |
| Storage | Supabase Storage | Receipt uploads |
| Payments | Stripe (optional) | PCI-compliant, no card data on server |
| Map | SVG (custom) | Full control, no API key needed |
| Charts | Recharts or Chart.js | Easy React integration |
| Rich text | TipTap | Bylaws editor, headless, extensible |
| Deploy | Vercel | Zero-config Next.js, HTTPS auto |

### Data Model (Simplified)

```
lots
  id, address, lot_number, owner_name, owner_email, owner_phone, notes, created_at

dues_payments
  id, lot_id, year, amount_paid, amount_due, paid_date, method, stripe_payment_id, status

expenditures
  id, date, category, vendor, amount, description, receipt_url, created_by, created_at

bylaws_versions
  id, content (rich text / markdown), created_by, created_at, is_current

users
  id (auth uid), lot_id, role (board | member), email
```

---

## 6. Security Checklist (Pre-Launch)

- [ ] All routes require authentication (middleware-level, not just UI)
- [ ] Board role verified server-side on every mutation
- [ ] RLS enabled on all Supabase tables
- [ ] No PII in client-side logs or error messages
- [ ] Stripe webhook validated with signing secret (if Stripe enabled)
- [ ] Receipts in private Supabase Storage bucket (board-only access)
- [ ] Environment variables never committed to git
- [ ] HTTPS enforced (Vercel handles this)
- [ ] Rate limiting on auth endpoints
- [ ] Privacy notice page live and linked in footer
- [ ] Lot offboarding (ownership transfer) flow tested
- [ ] Board accounts have MFA enabled
- [ ] No third-party analytics or tracking pixels installed
- [ ] Board resolution in meeting minutes authorizing the app

---

## 7. Infrastructure Costs

### Monthly Recurring

| Service | Tier | Cost |
|---|---|---|
| Supabase | Free (500MB DB, 1GB storage, 50k MAU) | $0 |
| Vercel | Free (Hobby) — sufficient for internal tools | $0 |
| Domain | ~$12–15/yr | ~$1/mo |
| Email forwarding | Cloudflare Email Routing (free) or ImprovMX (free tier) | $0 |
| Clerk (if chosen) | Free up to 10k MAU | $0 |
| Plausible (optional analytics) | $9/mo — skip at this scale | $0 |
| Stripe | No monthly fee — per-transaction only | $0 base |

**Base cost: ~$12–15/year** (domain only) on free tiers.

### Stripe Transaction Cost (if online payments enabled)

- 2.9% + $0.30 per transaction
- Example: $200 dues × 43 homes, all paying online → ~$6.10/transaction → **~$262/year in fees**
- Board can pass this to payers as a convenience fee, or absorb as an operating expense
- If dues are collected by check/Zelle: $0

### When Free Tiers Break

Supabase free is sufficient for 43 households indefinitely — you'd need thousands of records and gigabytes of receipts to hit limits. The only meaningful upgrade is:

- **Supabase Pro ($25/mo)** — adds automated daily backups with point-in-time restore. Recommended given this is financial data. Losing records is a bad scenario for a board.
- Vercel Pro ($20/mo) — not needed here.

### Realistic Total

| Scenario | Monthly | Annual |
|---|---|---|
| Minimal (free tiers, offline payments) | ~$1 | ~$15 |
| Recommended (+ Supabase Pro backups) | ~$26 | ~$315 |
| With Stripe online payments | ~$26 + fees | ~$315 + ~$200–300 in fees |

At $315/year, this is a legitimate HOA operating expense line item.

---

## 8. Out of Scope (v1)

- Email/SMS payment reminders (consider for v2)
- Online dispute resolution
- Maintenance request tracking
- Voting / ballots
- Mobile app (responsive web is sufficient)
- Integration with county tax records

---

## 9. Open Decisions (Board Must Resolve)

| # | Question | Impact |
|---|---|---|
| 1 | Will dues be collected online (Stripe) or offline only? | Determines payment architecture |
| 2 | Who will be the technical admin / database owner? | Determines auth setup |
| 3 | Is there an existing member email list? | Seeding the database |
| 4 | Exact number of lots — 43 or 44? | Map and progress ring |
| 5 | What is the annual dues amount? | Payment amount config |
| 6 | Should member view require invite or self-signup? | Auth flow |
| 7 | Do you have lot boundary data, or does that need to be sourced? | Map build dependency |

---

## 10. Phased Build Plan

### Phase 1 — Foundation (Claude Code Sprint 1)

- Supabase project setup (schema + RLS policies)
- Auth (board login + member login)
- Lot management CRUD (no map yet)
- Basic member list view

### Phase 2 — Map & Financials (Sprint 2)

- SVG neighborhood map with lot coloring
- Lot detail panel (click-to-open)
- Expenditure tracker
- Financial dashboard (balance, progress ring, spending chart)

### Phase 3 — Bylaws & Polish (Sprint 3)

- Bylaws editor (TipTap) with version history
- PDF export
- Member self-service account page
- Mobile responsiveness pass

### Phase 4 — Payments (if Stripe selected)

- Stripe Checkout integration
- Webhook handler to auto-mark dues paid
- Receipt download

---

## 11. Prompt Strategy for Claude Code

When starting each phase with Claude Code, include:

1. This PRD as context
2. Your Supabase project URL and anon key (as env vars, not in prompt)
3. Which phase you're building
4. Any decisions made from Section 9

Start Phase 1 with this framing:

> "Using this PRD, build Phase 1 of the Summer Meadows HOA portal. Use Next.js App Router, Supabase for auth and database, and Tailwind CSS. Set up the schema with RLS. Board role is stored as a custom claim. Do not build the map yet — focus on auth, lot CRUD, and the data model."

---

*PRD v1.1 — May 2026. Resolve open decisions in Section 9 before beginning build.*
