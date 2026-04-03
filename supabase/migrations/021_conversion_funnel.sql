-- Conversion funnel analytics (additive).

create table if not exists public.user_funnel_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_funnel_events_user_created
  on public.user_funnel_events (user_id, created_at desc);

create index if not exists idx_user_funnel_events_type_created
  on public.user_funnel_events (event_type, created_at desc);

alter table public.user_funnel_events enable row level security;

create table if not exists public.credit_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  action text not null,
  credits_used integer not null default 0 check (credits_used >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_credit_usage_logs_user_created
  on public.credit_usage_logs (user_id, created_at desc);

alter table public.credit_usage_logs enable row level security;

create table if not exists public.upgrade_triggers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  trigger_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_upgrade_triggers_user_created
  on public.upgrade_triggers (user_id, created_at desc);

alter table public.upgrade_triggers enable row level security;
