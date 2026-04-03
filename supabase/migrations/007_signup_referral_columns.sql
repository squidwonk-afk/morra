-- Referral fields on users (safe for DBs created before referral_code / referred_by existed)
-- referred_by is stored as text (UUID string) for compatibility with app queries.

alter table public.users
  add column if not exists referral_code text;

alter table public.users
  add column if not exists referred_by text;

update public.users
set referral_code = lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
where referral_code is null or length(trim(referral_code)) = 0;

create unique index if not exists idx_users_referral_code_unique
  on public.users (referral_code);

create index if not exists idx_users_referred_by
  on public.users (referred_by)
  where referred_by is not null;
