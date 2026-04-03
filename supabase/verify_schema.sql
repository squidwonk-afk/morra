-- Run in Supabase SQL Editor to confirm core objects exist (read-only checks).
select c.relname as table_name
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'users',
    'credits',
    'usage_logs',
    'generations',
    'referrals',
    'xp_levels',
    'reward_events',
    'referral_revenue_accruals',
    'connect_payouts',
    'stripe_webhook_events',
    'transactions'
  )
order by c.relname;

-- Expected columns on public.users (representative; app selects these)
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'users'
order by ordinal_position;
