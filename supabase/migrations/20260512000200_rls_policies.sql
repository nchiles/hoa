-- 20260512000200_rls_policies.sql
-- Row-level security. Members can only see their own lot and its dues.
-- Board members can see and mutate everything. Authenticated users can read
-- the currently-ratified bylaws.

alter table public.profiles        enable row level security;
alter table public.lots            enable row level security;
alter table public.dues_payments   enable row level security;
alter table public.expenditures    enable row level security;
alter table public.bylaws_versions enable row level security;

-- ── profiles ────────────────────────────────────────────────────────────────
create policy "profiles self read"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "profiles board read"
  on public.profiles for select
  to authenticated
  using (public.is_board());

create policy "profiles board write"
  on public.profiles for all
  to authenticated
  using (public.is_board())
  with check (public.is_board());

-- ── lots ────────────────────────────────────────────────────────────────────
create policy "lots board all"
  on public.lots for all
  to authenticated
  using (public.is_board())
  with check (public.is_board());

create policy "lots member read own"
  on public.lots for select
  to authenticated
  using (id = public.my_lot_id());

-- ── dues_payments ───────────────────────────────────────────────────────────
create policy "dues board all"
  on public.dues_payments for all
  to authenticated
  using (public.is_board())
  with check (public.is_board());

create policy "dues member read own"
  on public.dues_payments for select
  to authenticated
  using (lot_id = public.my_lot_id());

-- ── expenditures ────────────────────────────────────────────────────────────
-- Aggregate financial data is shown to all authenticated members via the
-- member dashboard in Phase 2. Until then, board-only.
create policy "expenditures board all"
  on public.expenditures for all
  to authenticated
  using (public.is_board())
  with check (public.is_board());

create policy "expenditures member read"
  on public.expenditures for select
  to authenticated
  using (auth.uid() is not null);

-- ── bylaws_versions ─────────────────────────────────────────────────────────
create policy "bylaws board all"
  on public.bylaws_versions for all
  to authenticated
  using (public.is_board())
  with check (public.is_board());

create policy "bylaws member read current"
  on public.bylaws_versions for select
  to authenticated
  using (is_current = true);
