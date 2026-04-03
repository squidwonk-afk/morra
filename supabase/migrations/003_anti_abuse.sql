-- Anti-abuse: device binding, flags, usage audit, referral validation

alter table public.users
  add column if not exists flagged boolean not null default false;

alter table public.users
  add column if not exists last_request_time timestamptz;

alter table public.users
  add column if not exists signup_ip text;

create unique index if not exists idx_users_device_id_unique
  on public.users (device_id)
  where device_id is not null and length(trim(device_id)) > 0;

alter table public.usage_logs
  add column if not exists ip_address text;

alter table public.usage_logs
  add column if not exists device_id text;

alter table public.referrals
  add column if not exists validated boolean not null default false;

alter table public.referrals
  add column if not exists ip_suspected boolean not null default false;

alter table public.referrals
  add column if not exists subscription_rewarded boolean not null default false;

alter table public.referrals
  drop constraint if exists referrals_status_check;

alter table public.referrals
  add constraint referrals_status_check
  check (status in ('pending', 'active', 'invalid'));

alter table public.generations
  add column if not exists input_fingerprint text;

create index if not exists idx_generations_user_fingerprint_time
  on public.generations (user_id, input_fingerprint, created_at desc);
