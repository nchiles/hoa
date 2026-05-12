-- 20260512000000_init_schema.sql
-- Tables for the Summer Meadows HOA portal. RLS policies live in a separate
-- migration so the schema can be read in isolation.

create extension if not exists pgcrypto;
create extension if not exists citext;

-- profiles: every auth.users row gets a matching profiles row via the
-- handle_new_user() trigger (see 20260512000100_rls_helpers.sql). lot_id is
-- populated by case-insensitive email match against lots.owner_email at signup.
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      citext not null unique,
  role       text not null default 'member' check (role in ('board', 'member')),
  lot_id     uuid,
  created_at timestamptz not null default now()
);

-- lots: one row per parcel in the subdivision.
create table public.lots (
  id          uuid primary key default gen_random_uuid(),
  lot_number  text not null unique,
  address     text not null,
  owner_name  text,
  owner_email citext,
  owner_phone text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index lots_owner_email_idx on public.lots (owner_email);

alter table public.profiles
  add constraint profiles_lot_fk
  foreign key (lot_id) references public.lots(id) on delete set null;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger lots_set_updated_at
  before update on public.lots
  for each row execute function public.set_updated_at();

-- dues_payments: one row per lot per year. stripe_payment_id is reserved for
-- Phase 4; until then it stays null for offline payments.
create table public.dues_payments (
  id                uuid primary key default gen_random_uuid(),
  lot_id            uuid not null references public.lots(id) on delete cascade,
  year              int  not null,
  amount_due        numeric(10, 2) not null,
  amount_paid       numeric(10, 2) not null default 0,
  paid_date         date,
  method            text check (method in ('online', 'check', 'cash', 'zelle', 'other')),
  stripe_payment_id text,
  status            text not null default 'unpaid'
                    check (status in ('unpaid', 'partial', 'paid', 'waived')),
  notes             text,
  created_at        timestamptz not null default now(),
  unique (lot_id, year)
);
create index dues_payments_lot_idx  on public.dues_payments (lot_id);
create index dues_payments_year_idx on public.dues_payments (year);

-- expenditures: board CRUD in Phase 2; schema in place now so member-facing
-- dashboard math can be done against a stable table.
create table public.expenditures (
  id          uuid primary key default gen_random_uuid(),
  date        date not null,
  category    text not null,
  vendor      text,
  amount      numeric(10, 2) not null,
  description text,
  receipt_url text,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index expenditures_date_idx     on public.expenditures (date desc);
create index expenditures_category_idx on public.expenditures (category);

-- bylaws_versions: every save creates a new row. Only one row at a time may
-- have is_current = true (enforced by partial unique index).
create table public.bylaws_versions (
  id         uuid primary key default gen_random_uuid(),
  content    text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  is_current boolean not null default false
);
create unique index bylaws_one_current
  on public.bylaws_versions (is_current)
  where is_current = true;
