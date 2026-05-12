-- 20260512000100_rls_helpers.sql
-- Trigger and helper functions used by RLS policies. SECURITY DEFINER lets
-- them bypass RLS internally; the policies that call them still constrain the
-- caller.

-- Auto-create a profiles row for every new auth.users insert. If the email
-- matches an existing lots.owner_email, link the lot. Email match is
-- case-insensitive because both columns are citext.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lot uuid;
begin
  select id into v_lot
  from public.lots
  where owner_email = new.email::citext
  limit 1;

  insert into public.profiles (id, email, role, lot_id)
  values (new.id, new.email::citext, 'member', v_lot);

  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- True when the current request's user has the 'board' role.
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
    where id = auth.uid() and role = 'board'
  );
$$;

-- The current request's user's lot_id (null if unlinked).
create or replace function public.my_lot_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select lot_id
  from public.profiles
  where id = auth.uid();
$$;

-- Lock these helpers down: anon/authenticated should only execute, not
-- redefine. (Postgres defaults to grant execute to public on functions, which
-- is fine here — we want both anon and authenticated roles to call them.)
revoke all on function public.handle_new_user() from public;
grant  execute on function public.is_board()    to authenticated, anon;
grant  execute on function public.my_lot_id()   to authenticated;
