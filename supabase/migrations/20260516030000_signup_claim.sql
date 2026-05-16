-- 20260516030000_signup_claim.sql
-- PR 3 of the signup-approval model (docs/SIGNUP_APPROVAL.md).
-- A self-service homeowner who claims a matched lot is created 'pending'
-- and linked to that lot. The board approves them from /admin/approvals.
-- Founding-president / board-invite paths are unchanged and stay 'active'.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lot         uuid;
  v_role        text;
  v_has_board   boolean;
  v_hinted_role text;
  v_kind        text;
  v_addr        text;
begin
  v_kind := new.raw_user_meta_data->>'signup_kind';

  -- Self-service homeowner claim. Always pending, linked to the matched
  -- lot (resolved here, not trusted from the client). lot_address is set
  -- by the signup action only after signup_address_lookup confirmed a
  -- match; the board still reviews every one of these.
  if v_kind = 'claim' then
    v_addr := new.raw_user_meta_data->>'lot_address';
    select id into v_lot
    from public.lots
    where public.norm_address(address) = public.norm_address(v_addr)
    limit 1;

    insert into public.profiles (id, email, role, lot_id, status)
    values (new.id, new.email::citext, 'member', v_lot, 'pending');
    return new;
  end if;

  -- Founding-president / first-user-wins, or board-invite role hint.
  -- These are trusted setup paths and are created active.
  select exists (
    select 1 from public.profiles where role = 'board' and status = 'active'
  ) into v_has_board;

  v_hinted_role := case
    when new.raw_user_meta_data->>'role' = 'board' then 'board'
    else null
  end;

  v_role := coalesce(
    v_hinted_role,
    case when not v_has_board then 'board' else 'member' end
  );

  select id into v_lot
  from public.lots
  where owner_email = new.email::citext
  limit 1;

  insert into public.profiles (id, email, role, lot_id, status)
  values (new.id, new.email::citext, v_role, v_lot, 'active');
  return new;
end $$;

-- Anonymous /signup needs the HOA name for the "this lot is part of the
-- {name} HOA" copy. hoa_settings is RLS-protected from anon, so expose
-- just the name via a SECURITY DEFINER function.
create or replace function public.public_hoa_name()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select name from public.hoa_settings where id = 1;
$$;

revoke all on function public.public_hoa_name() from public;
grant execute on function public.public_hoa_name() to anon, authenticated;
