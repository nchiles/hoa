-- 20260512000300_relink_helper.sql
-- SECURITY DEFINER helper that lets a signed-in user reconcile their profile's
-- lot_id with the current lots table by case-insensitive email match.
--
-- The original handle_new_user() trigger only fires at auth signup, so a
-- homeowner who signs in before the board adds their lot record (or before an
-- owner_email update propagates) stays unlinked forever. This function makes
-- that self-heal on demand: /me calls it on every page load.
--
-- Safe to call repeatedly. No-op when the profile is already linked or no lot
-- matches.

create or replace function public.relink_my_lot()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_email citext;
  v_lot   uuid;
  v_current uuid;
begin
  if v_uid is null then
    return null;
  end if;

  select email, lot_id into v_email, v_current
    from public.profiles
   where id = v_uid;

  if v_current is not null then
    return v_current;
  end if;

  select id into v_lot
    from public.lots
   where owner_email = v_email
   limit 1;

  if v_lot is not null then
    update public.profiles set lot_id = v_lot where id = v_uid;
  end if;

  return v_lot;
end $$;

revoke all on function public.relink_my_lot() from public;
grant execute on function public.relink_my_lot() to authenticated;
