-- 20260516010000_structured_address.sql
-- Split the free-text lots.address into structured parts so data entry
-- (CSV import + the lot form) is unambiguous. The whole subdivision shares
-- city/state/zip, so those live on hoa_settings rather than per lot.
--
-- `address` is rebuilt as a STORED generated column from the parts, so every
-- existing reader (signup RPCs norm_address/signup_address_lookup/
-- verify_lot_email, the /lots list + search, lot detail headers) keeps
-- working with no code change — only writers change.

alter table public.lots add column street_number text;
alter table public.lots add column street_name   text;

-- Best-effort backfill of any rows already present (test data): first token
-- is the street number, the remainder is the street name.
update public.lots
set street_number = nullif(split_part(address, ' ', 1), ''),
    street_name   = nullif(
                      btrim(substring(address from position(' ' in address) + 1)),
                      '')
where street_name is null;

-- Degenerate rows with no space: keep the whole value as the street name.
update public.lots
set street_name = address
where street_name is null and address is not null and btrim(address) <> '';

alter table public.lots drop column address;

alter table public.lots
  add column address text
  generated always as (
    btrim(coalesce(street_number, '') || ' ' || coalesce(street_name, ''))
  ) stored;

-- street_name is the minimum needed to identify a lot; street_number is
-- nullable so the backfill can't fail on odd legacy rows (the CSV/form
-- validators still require it for new entry).
alter table public.lots alter column street_name set not null;

-- HOA-wide location. Shared by every lot; not duplicated per row.
alter table public.hoa_settings add column city  text;
alter table public.hoa_settings add column state text;
alter table public.hoa_settings add column zip   text;
