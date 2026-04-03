-- Competitive referral growth layer: ledger, stats, leaderboard, milestones.
-- Extends existing referral flows; does not replace referral_revenue_accruals or RPCs.

create table if not exists public.referral_earnings (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles (id) on delete cascade,
  referred_user_id uuid not null references public.profiles (id) on delete cascade,
  source text not null,
  amount_cents integer not null check (amount_cents > 0),
  idempotency_key text not null unique,
  tier_at_accrual smallint check (tier_at_accrual >= 1 and tier_at_accrual <= 4),
  created_at timestamptz not null default now()
);

create index if not exists idx_referral_earnings_referrer_created
  on public.referral_earnings (referrer_id, created_at desc);

alter table public.referral_earnings enable row level security;

create table if not exists public.referral_stats (
  referrer_id uuid primary key references public.profiles (id) on delete cascade,
  total_earned_cents bigint not null default 0 check (total_earned_cents >= 0),
  total_conversions integer not null default 0 check (total_conversions >= 0),
  active_referrals integer not null default 0 check (active_referrals >= 0),
  tier smallint not null default 1 check (tier >= 1 and tier <= 4),
  updated_at timestamptz not null default now()
);

alter table public.referral_stats enable row level security;

create table if not exists public.referral_leaderboard (
  referrer_id uuid primary key references public.profiles (id) on delete cascade,
  rank integer not null check (rank > 0),
  total_earned_cents bigint not null default 0,
  referral_count integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists idx_referral_leaderboard_rank
  on public.referral_leaderboard (rank asc);

alter table public.referral_leaderboard enable row level security;

create table if not exists public.referral_milestone_claims (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles (id) on delete cascade,
  milestone_key text not null,
  credits_awarded integer not null check (credits_awarded > 0),
  created_at timestamptz not null default now(),
  unique (referrer_id, milestone_key)
);

create index if not exists idx_referral_milestone_claims_referrer
  on public.referral_milestone_claims (referrer_id);

alter table public.referral_milestone_claims enable row level security;
