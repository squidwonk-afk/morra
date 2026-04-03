-- Unified financial / credit ledger for auditing and debugging.
-- Note: Application source of truth for balances remains:
--   - credits.balance (MORRA credits)
--   - users.earnings_balance_cents / pending_balance_cents (referral USD cents)
--   - reward_events, connect_payouts (detailed audit)
-- This table is additive; rows are best-effort (insert failures are logged, not thrown).

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type text not null,
  amount integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.transactions is 'Ledger: subscription credit grants, pack purchases, payouts. Interpret amount via metadata.unit (credits|cents) and type.';

create index if not exists idx_transactions_user_created
  on public.transactions (user_id, created_at desc);

create index if not exists idx_transactions_type
  on public.transactions (type, created_at desc);

alter table public.transactions enable row level security;

-- No GRANT to anon/authenticated for writes; API uses service_role only.
