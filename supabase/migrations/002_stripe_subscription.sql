-- Stripe subscription + idempotent webhook processing
-- Run after initial schema in Supabase SQL editor

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

create table if not exists public.stripe_webhook_events (
  stripe_event_id text primary key,
  created_at timestamptz not null default now()
);

alter table public.stripe_webhook_events enable row level security;
