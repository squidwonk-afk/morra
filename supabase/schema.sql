-- MORRA core schema — run in Supabase SQL editor or via migration
-- Enable extensions
create extension if not exists "pgcrypto";

-- Users (passwordless: username + PIN hash)
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  display_name text not null,
  pin_hash text not null,
  created_at timestamptz not null default now(),
  device_id text,
  referral_code text not null unique,
  plan text not null default 'free' check (plan in ('free', 'starter', 'pro', 'elite')),
  referred_by text,
  has_seen_gift boolean not null default false,
  flagged boolean not null default false,
  last_request_time timestamptz,
  signup_ip text
);

create unique index if not exists idx_users_device_id_unique
  on public.users (device_id)
  where device_id is not null and length(trim(device_id)) > 0;

create index if not exists idx_users_username_lower on public.users (lower(username));
create index if not exists idx_users_referral_code on public.users (referral_code);
create index if not exists idx_users_referred_by on public.users (referred_by)
  where referred_by is not null;

-- Credits (one row per user)
create table if not exists public.credits (
  user_id uuid primary key references public.users (id) on delete cascade,
  balance integer not null default 0 check (balance >= 0)
);

-- Usage audit
create table if not exists public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  action_type text not null,
  credits_used integer not null default 0 check (credits_used >= 0),
  created_at timestamptz not null default now(),
  ip_address text,
  device_id text
);

create index if not exists idx_usage_logs_user_time on public.usage_logs (user_id, created_at desc);

-- Stored generations
create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type text not null,
  input_data jsonb not null default '{}',
  output_data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  input_fingerprint text
);

create index if not exists idx_generations_user on public.generations (user_id, created_at desc);

create index if not exists idx_generations_user_fingerprint_time
  on public.generations (user_id, input_fingerprint, created_at desc);

-- Referrals (tracking only; rewards applied in app logic)
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.users (id) on delete cascade,
  referred_user_id uuid not null unique references public.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'active', 'invalid')),
  first_action_at timestamptz,
  created_at timestamptz not null default now(),
  validated boolean not null default false,
  ip_suspected boolean not null default false,
  subscription_rewarded boolean not null default false
);

create index if not exists idx_referrals_referrer on public.referrals (referrer_id);

-- Level curve for rewards (min XP per level); per-user XP/streak in public.user_xp (app).
create table if not exists public.level_thresholds (
  level integer primary key check (level >= 1),
  xp_required integer not null check (xp_required >= 0)
);

insert into public.level_thresholds (level, xp_required)
select g, (g - 1) * 100
from generate_series(1, 500) as g
on conflict (level) do nothing;

-- Reward triggers and grants (level-ups, referrals, daily bonus, etc.)
create table if not exists public.reward_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  trigger_type text not null,
  payload jsonb not null default '{}',
  credits_granted integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_reward_events_user on public.reward_events (user_id, created_at desc);

-- One daily_login reward per user per UTC calendar day (prevents double-claim races)
create unique index if not exists reward_events_daily_login_one_per_utc_day
  on public.reward_events (
    user_id,
    ((created_at at time zone 'utc')::date)
  )
  where trigger_type = 'daily_login';

-- Optional: enable RLS and deny anon — app uses service role on server only
alter table public.users enable row level security;
alter table public.credits enable row level security;
alter table public.usage_logs enable row level security;
alter table public.generations enable row level security;
alter table public.referrals enable row level security;
alter table public.level_thresholds enable row level security;
alter table public.reward_events enable row level security;

-- Stripe subscriptions (idempotent webhooks)
alter table public.users
  add column if not exists stripe_customer_id text unique;

alter table public.users
  add column if not exists stripe_subscription_id text unique;

alter table public.users
  add column if not exists subscription_status text;

alter table public.users
  add column if not exists subscription_plan text;

alter table public.users
  add column if not exists subscription_current_period_end timestamptz;

alter table public.users
  add column if not exists last_credit_refresh timestamptz;

create index if not exists idx_users_stripe_customer on public.users (stripe_customer_id);

alter table public.users
  add column if not exists stripe_connect_account_id text unique;

alter table public.users
  add column if not exists earnings_balance_cents integer not null default 0 check (earnings_balance_cents >= 0);

alter table public.users
  add column if not exists pending_balance_cents integer not null default 0 check (pending_balance_cents >= 0);

create index if not exists idx_users_stripe_connect_account
  on public.users (stripe_connect_account_id)
  where stripe_connect_account_id is not null;

create table if not exists public.referral_revenue_accruals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.users (id) on delete cascade,
  referred_user_id uuid not null references public.users (id) on delete cascade,
  stripe_invoice_id text not null unique,
  amount_cents integer not null check (amount_cents > 0),
  tier smallint not null check (tier >= 1 and tier <= 4),
  percent_bps integer not null,
  created_at timestamptz not null default now(),
  available_at timestamptz not null,
  released_at timestamptz
);

create index if not exists idx_referral_revenue_referrer on public.referral_revenue_accruals (referrer_id);

create table if not exists public.connect_payouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  stripe_transfer_id text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_connect_payouts_user on public.connect_payouts (user_id, created_at desc);

alter table public.referral_revenue_accruals enable row level security;
alter table public.connect_payouts enable row level security;

create table if not exists public.stripe_webhook_events (
  stripe_event_id text primary key,
  created_at timestamptz not null default now()
);

alter table public.stripe_webhook_events enable row level security;

-- Ledger (optional audit; populated by tryInsertTransactionLedger from API)
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type text not null,
  amount integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_transactions_user_created
  on public.transactions (user_id, created_at desc);

alter table public.transactions enable row level security;

-- Atomic XP increment (service_role only; avoids lost updates under concurrency)
create or replace function public.morra_apply_xp_delta(p_user_id uuid, p_delta integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new integer;
begin
  if p_delta = 0 then
    select xp into v_new from public.user_xp where user_id = p_user_id;
    if v_new is null then
      raise exception 'user_xp row missing for user %', p_user_id;
    end if;
    return v_new;
  end if;

  update public.user_xp
  set xp = xp + p_delta
  where user_id = p_user_id
  returning xp into v_new;

  if v_new is null then
    raise exception 'user_xp row missing for user %', p_user_id;
  end if;

  return v_new;
end;
$$;

revoke all on function public.morra_apply_xp_delta(uuid, integer) from public;
grant execute on function public.morra_apply_xp_delta(uuid, integer) to service_role;

-- No policies: only service_role bypasses RLS in Supabase (API routes use admin client).

-- Artist profiles (collab finder) + Artist services (marketplace)

-- Profiles
create table if not exists public.artist_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  username text,
  bio text,
  role text,
  styles text[] not null default '{}'::text[],
  looking_for text[] not null default '{}'::text[],
  created_at timestamp not null default now()
);

create unique index if not exists idx_artist_profiles_user_id_unique
  on public.artist_profiles (user_id);

create index if not exists idx_artist_profiles_role
  on public.artist_profiles (role);

create index if not exists idx_artist_profiles_styles_gin
  on public.artist_profiles using gin (styles);

create index if not exists idx_artist_profiles_looking_for_gin
  on public.artist_profiles using gin (looking_for);

alter table public.artist_profiles enable row level security;

-- Services
create table if not exists public.artist_services (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  description text,
  category text,
  styles text[] not null default '{}'::text[],
  price_range text,
  created_at timestamp not null default now()
);

create index if not exists idx_artist_services_user_created
  on public.artist_services (user_id, created_at desc);

create index if not exists idx_artist_services_category
  on public.artist_services (category);

create index if not exists idx_artist_services_styles_gin
  on public.artist_services using gin (styles);

alter table public.artist_services enable row level security;

-- Socials (no internal messaging)
create table if not exists public.artist_socials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users (id) on delete cascade,
  instagram text,
  tiktok text,
  soundcloud text,
  spotify text
);

alter table public.artist_socials enable row level security;

-- Notifications (system-generated only)
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamp not null default now()
);

create index if not exists idx_notifications_user_created
  on public.notifications (user_id, created_at desc);

create index if not exists idx_notifications_user_unread
  on public.notifications (user_id, read)
  where read = false;

alter table public.notifications enable row level security;
