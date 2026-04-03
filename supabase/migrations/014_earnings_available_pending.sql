-- Canonical referral USD buckets on profiles (pending = hold, available = withdrawable).
alter table public.profiles
  add column if not exists earnings_available_cents integer not null default 0
  check (earnings_available_cents >= 0);

alter table public.profiles
  add column if not exists earnings_pending_cents integer not null default 0
  check (earnings_pending_cents >= 0);

-- One-time copy from legacy column names when present.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'earnings_balance_cents'
  ) then
    execute $q$
      update public.profiles set
        earnings_available_cents = coalesce(earnings_balance_cents, 0),
        earnings_pending_cents = coalesce(pending_balance_cents, 0)
    $q$;
  end if;
end $$;

-- Keep legacy balance column names aligned for any old readers.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'earnings_balance_cents'
  ) then
    execute $q$
      update public.profiles set
        earnings_balance_cents = earnings_available_cents,
        pending_balance_cents = earnings_pending_cents
    $q$;
  end if;
end $$;

-- Internal payout audit (Stripe dashboard remains source of truth for money movement).
create table if not exists public.payout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  amount_cents integer not null check (amount_cents > 0),
  stripe_transfer_id text,
  status text not null check (status in ('pending', 'succeeded', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payout_logs_user_created
  on public.payout_logs (user_id, created_at desc);

alter table public.payout_logs enable row level security;
