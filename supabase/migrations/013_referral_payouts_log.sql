-- Lightweight payout audit (user-initiated Connect transfers). Complements connect_payouts.
create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  amount_cents integer not null check (amount_cents > 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_payouts_user_created_at
  on public.payouts (user_id, created_at desc);

alter table public.payouts enable row level security;
