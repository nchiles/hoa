-- 20260516020000_profile_status.sql
-- PR 1 of the signup-approval model (see docs/SIGNUP_APPROVAL.md).
-- Adds a profile lifecycle status. A self-service homeowner will be created
-- 'pending' (in PR 3) and sees nothing until the board approves them.
-- Everything that exists today (board accounts, any current rows) defaults
-- to 'active', so behavior is unchanged until the signup rewrite lands.

alter table public.profiles
  add column status text not null default 'active'
  check (status in ('active', 'pending', 'rejected'));

-- A pending/rejected profile must see no HOA data — not even its own lot or
-- dues. The member-facing RLS policies all key off my_lot_id(); making it
-- return null unless the profile is active enforces "pending = nothing"
-- everywhere at once without touching each policy.
create or replace function public.my_lot_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select lot_id
  from public.profiles
  where id = auth.uid() and status = 'active';
$$;

-- Defense in depth: a board account is only authoritative while active.
create or replace function public.is_board()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'board' and status = 'active'
  );
$$;
