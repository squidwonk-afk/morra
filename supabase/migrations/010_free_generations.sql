-- Free generation system columns (safe, no duplicates)
alter table public.users
  add column if not exists free_generations_used integer not null default 0;

alter table public.users
  add column if not exists first_seen_at timestamp;

alter table public.users
  add column if not exists last_free_generation_date date;

create index if not exists idx_users_first_seen_at
  on public.users (first_seen_at);

create index if not exists idx_users_last_free_generation_date
  on public.users (last_free_generation_date);

