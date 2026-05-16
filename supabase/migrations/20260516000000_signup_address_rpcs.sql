-- 20260516000000_signup_address_rpcs.sql
-- The /signup page is unauthenticated, so it cannot read public.lots directly
-- (RLS grants SELECT only to board and the lot's own member). These
-- SECURITY DEFINER functions give the anonymous signup flow exactly what it
-- needs — address matching and a masked email hint — while never returning
-- owner names or raw emails. Addresses are treated as near-public per the
-- privacy notice; names and emails are not exposed here.

-- Shared normalization, mirrors normalizeAddress() in the signup action:
-- lowercase, trim, strip . and , collapse internal whitespace.
create or replace function public.norm_address(p text)
returns text
language sql
immutable
as $$
  select regexp_replace(
           regexp_replace(lower(btrim(coalesce(p, ''))), '[.,]', '', 'g'),
           '\s+', ' ', 'g'
         );
$$;

-- Typeahead: return up to 8 lot addresses matching a partial query.
-- Address only — no owner data. Empty/short query returns nothing.
create or replace function public.search_lot_addresses(p_query text)
returns table (id uuid, address text)
language sql
stable
security definer
set search_path = public
as $$
  select l.id, l.address
  from public.lots l
  where length(btrim(coalesce(p_query, ''))) >= 2
    and public.norm_address(l.address) like
        '%' || public.norm_address(p_query) || '%'
  order by l.address
  limit 8;
$$;

-- Resolve a (possibly hand-typed) address to a signup branch. Returns the
-- canonical lot address and a masked email hint when applicable, but never
-- the raw email. The board-existence check is here too because profiles is
-- also RLS-protected from anon.
create or replace function public.signup_address_lookup(p_address text)
returns table (
  result        text,   -- matched | matched_no_email | no_match_bootstrap | no_match_locked
  lot_address   text,
  email_hint    text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_lot         public.lots%rowtype;
  v_has_board   boolean;
  v_local       text;
  v_domain      text;
  v_hint        text;
begin
  select * into v_lot
  from public.lots l
  where public.norm_address(l.address) = public.norm_address(p_address)
  limit 1;

  if found then
    if v_lot.owner_email is not null then
      v_local  := split_part(v_lot.owner_email::text, '@', 1);
      v_domain := split_part(v_lot.owner_email::text, '@', 2);
      if length(v_local) <= 2 then
        v_hint := left(v_local, 1) || '•@' || v_domain;
      else
        v_hint := left(v_local, 1) || '•••' ||
                  right(v_local, 1) || '@' || v_domain;
      end if;
      return query select 'matched', v_lot.address, v_hint;
    else
      return query select 'matched_no_email', v_lot.address, null::text;
    end if;
    return;
  end if;

  select exists (select 1 from public.profiles where role = 'board')
    into v_has_board;

  if v_has_board then
    return query select 'no_match_locked', null::text, null::text;
  else
    return query select 'no_match_bootstrap', null::text, null::text;
  end if;
end $$;

-- Confirm a homeowner's email against the lot on file without ever exposing
-- the stored email. Returns true only on a case-insensitive match.
create or replace function public.verify_lot_email(p_address text, p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.lots l
    where public.norm_address(l.address) = public.norm_address(p_address)
      and l.owner_email is not null
      and lower(l.owner_email::text) = lower(btrim(coalesce(p_email, '')))
  );
$$;

revoke all on function public.search_lot_addresses(text)  from public;
revoke all on function public.signup_address_lookup(text)  from public;
revoke all on function public.verify_lot_email(text, text) from public;

grant execute on function public.search_lot_addresses(text)  to anon, authenticated;
grant execute on function public.signup_address_lookup(text)  to anon, authenticated;
grant execute on function public.verify_lot_email(text, text) to anon, authenticated;
