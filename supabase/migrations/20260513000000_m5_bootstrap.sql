-- 20260513000000_m5_bootstrap.sql
-- M5: bootstrap & onboarding support.
--   1) hoa_settings singleton table for HOA-wide config (name, contact,
--      fiscal year, default dues amount).
--   2) handle_new_user() trigger reads raw_user_meta_data->>'role' so an
--      invite can mark the new account as 'board' without a follow-up SQL
--      flip. Default remains 'member'.

-- ── hoa_settings (singleton) ────────────────────────────────────────────────
create table public.hoa_settings (
  id                        smallint primary key default 1 check (id = 1),
  name                      text not null default 'Summer Meadows HOA',
  contact_email             citext,
  mailing_address           text,
  fiscal_year_start_month   smallint not null default 1
                            check (fiscal_year_start_month between 1 and 12),
  default_dues_amount_cents int  not null default 0
                            check (default_dues_amount_cents >= 0),
  updated_at                timestamptz not null default now(),
  updated_by                uuid references public.profiles(id) on delete set null
);

insert into public.hoa_settings (id) values (1) on conflict (id) do nothing;

create trigger hoa_settings_set_updated_at
  before update on public.hoa_settings
  for each row execute function public.set_updated_at();

alter table public.hoa_settings enable row level security;

-- Any authenticated user can read HOA settings (used by member-facing
-- contact info, footer, etc.). Only board can update.
create policy "hoa_settings auth read"
  on public.hoa_settings for select
  to authenticated
  using (auth.uid() is not null);

create policy "hoa_settings board update"
  on public.hoa_settings for update
  to authenticated
  using (public.is_board())
  with check (public.is_board());

-- ── handle_new_user(): first user wins board; honor invite role hint ────────
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
begin
  -- Bootstrap rule: if no board profile exists yet, the first user to sign
  -- in becomes the founding board member. This is the trust anchor — whoever
  -- reaches the fresh deployment first is, by definition, the operator
  -- setting it up. After this point, role assignments come from invites.
  select exists (select 1 from public.profiles where role = 'board')
    into v_has_board;

  -- Only 'board' is accepted as a metadata-driven role hint (set by
  -- inviteBoardMember). Anything else falls through.
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

  insert into public.profiles (id, email, role, lot_id)
  values (new.id, new.email::citext, v_role, v_lot);

  return new;
end $$;
