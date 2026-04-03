-- First-time onboarding gift flag (safe)
alter table public.users
  add column if not exists has_seen_gift boolean not null default false;

create index if not exists idx_users_has_seen_gift
  on public.users (has_seen_gift)
  where has_seen_gift = false;

