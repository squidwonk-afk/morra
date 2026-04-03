-- Stripe Connect + referral revenue (cents on users)

alter table public.users
  add column if not exists stripe_connect_account_id text unique;

alter table public.users
  add column if not exists earnings_balance_cents integer not null default 0 check (earnings_balance_cents >= 0);

alter table public.users
  add column if not exists pending_balance_cents integer not null default 0 check (pending_balance_cents >= 0);

create index if not exists idx_users_stripe_connect_account
  on public.users (stripe_connect_account_id)
  where stripe_connect_account_id is not null;

-- Per-invoice accrual (idempotency + 7-day release)
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
create index if not exists idx_referral_revenue_release on public.referral_revenue_accruals (available_at) where released_at is null;

alter table public.referral_revenue_accruals enable row level security;

-- Audit log for withdrawals
create table if not exists public.connect_payouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  stripe_transfer_id text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_connect_payouts_user on public.connect_payouts (user_id, created_at desc);

alter table public.connect_payouts enable row level security;
