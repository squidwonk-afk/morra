-- Referral Stripe hooks: process_referral_earning, reward_first_subscription
-- process_referral_earning: validates profiles.referred_by, no self-ref, active+validated referral, tier % on gross USD.
-- reward_first_subscription: same referred_by + no self-ref; referral not invalid / not ip_suspected (pending allowed).

create table if not exists public.referral_first_subscription_rewards (
  referred_user_id uuid primary key references public.profiles (id) on delete cascade,
  referrer_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_referral_first_sub_referrer
  on public.referral_first_subscription_rewards (referrer_id);

alter table public.referral_first_subscription_rewards enable row level security;

-- Tier from active validated referral count (matches src/lib/referral/tiers.ts)
create or replace function public.morra_referral_tier_from_count(p_count integer)
returns smallint
language sql
immutable
as $$
  select case
    when p_count >= 50 then 4::smallint
    when p_count >= 15 then 3::smallint
    when p_count >= 5 then 2::smallint
    else 1::smallint
  end;
$$;

create or replace function public.morra_referral_bps_from_tier(p_tier smallint)
returns integer
language sql
immutable
as $$
  select case p_tier
    when 4 then 500
    when 3 then 350
    when 2 then 200
    else 120
  end;
$$;

-- p_amount_usd = gross payment. Commission = floor(gross_cents * bps / 10000). Idempotent per p_idempotency_key.
create or replace function public.process_referral_earning(
  p_referrer_id uuid,
  p_amount_usd numeric,
  p_referred_user_id uuid,
  p_idempotency_key text,
  p_source text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payer record;
  v_ref record;
  v_referrer_flagged boolean;
  v_active_count integer;
  v_tier smallint;
  v_bps integer;
  v_gross_cents bigint;
  v_commission_cents integer;
  v_row_count integer;
begin
  if p_referrer_id is null or p_referred_user_id is null then
    return false;
  end if;
  if p_referrer_id = p_referred_user_id then
    return false;
  end if;
  if p_amount_usd is null or p_amount_usd <= 0 then
    return false;
  end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    return false;
  end if;

  if not exists (select 1 from public.profiles where id = p_referred_user_id) then
    return false;
  end if;

  select referred_by into v_payer from public.profiles where id = p_referred_user_id;
  if v_payer.referred_by is null or trim(v_payer.referred_by::text) = '' then
    return false;
  end if;
  if trim(v_payer.referred_by::text)::uuid <> p_referrer_id then
    return false;
  end if;

  select id, status, validated, ip_suspected
  into v_ref
  from public.referrals
  where referrer_id = p_referrer_id
    and referred_user_id = p_referred_user_id;

  if not found then
    return false;
  end if;
  if v_ref.status <> 'active' or not v_ref.validated or coalesce(v_ref.ip_suspected, false) then
    return false;
  end if;

  select coalesce(flagged, false) into v_referrer_flagged
  from public.profiles
  where id = p_referrer_id;
  if not found or v_referrer_flagged then
    return false;
  end if;

  select count(*)::integer into v_active_count
  from public.referrals
  where referrer_id = p_referrer_id
    and status = 'active'
    and validated = true
    and coalesce(ip_suspected, false) = false;

  v_tier := public.morra_referral_tier_from_count(v_active_count);
  v_bps := public.morra_referral_bps_from_tier(v_tier);
  v_gross_cents := floor(p_amount_usd * 100)::bigint;
  if v_gross_cents <= 0 then
    return false;
  end if;
  v_commission_cents := floor((v_gross_cents * v_bps) / 10000)::integer;
  if v_commission_cents <= 0 then
    return false;
  end if;

  insert into public.referral_earnings (
    referrer_id,
    referred_user_id,
    source,
    amount_cents,
    idempotency_key,
    tier_at_accrual
  )
  values (
    p_referrer_id,
    p_referred_user_id,
    coalesce(nullif(trim(p_source), ''), 'stripe'),
    v_commission_cents,
    p_idempotency_key,
    v_tier
  )
  on conflict (idempotency_key) do nothing;

  get diagnostics v_row_count = row_count;
  return v_row_count > 0;
end;
$$;

revoke all on function public.process_referral_earning(uuid, numeric, uuid, text, text) from public;
grant execute on function public.process_referral_earning(uuid, numeric, uuid, text, text) to service_role;

revoke all on function public.morra_referral_tier_from_count(integer) from public;
grant execute on function public.morra_referral_tier_from_count(integer) to service_role;

revoke all on function public.morra_referral_bps_from_tier(smallint) from public;
grant execute on function public.morra_referral_bps_from_tier(smallint) to service_role;

-- One row per referred user (first subscription bonus tracking). Pending referral link OK; not invalid / not suspected.
create or replace function public.reward_first_subscription(
  p_referrer_id uuid,
  p_referred_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payer record;
  v_ref record;
  v_referrer_flagged boolean;
  v_row_count integer;
begin
  if p_referrer_id is null or p_referred_user_id is null then
    return false;
  end if;
  if p_referrer_id = p_referred_user_id then
    return false;
  end if;

  select referred_by into v_payer from public.profiles where id = p_referred_user_id;
  if v_payer.referred_by is null or trim(v_payer.referred_by::text) = '' then
    return false;
  end if;
  if trim(v_payer.referred_by::text)::uuid <> p_referrer_id then
    return false;
  end if;

  select status, validated, ip_suspected into v_ref
  from public.referrals
  where referrer_id = p_referrer_id
    and referred_user_id = p_referred_user_id;

  if not found then
    return false;
  end if;
  if v_ref.status = 'invalid' or coalesce(v_ref.ip_suspected, false) then
    return false;
  end if;

  select coalesce(flagged, false) into v_referrer_flagged
  from public.profiles
  where id = p_referrer_id;
  if not found or v_referrer_flagged then
    return false;
  end if;

  insert into public.referral_first_subscription_rewards (referred_user_id, referrer_id)
  values (p_referred_user_id, p_referrer_id)
  on conflict (referred_user_id) do nothing;

  get diagnostics v_row_count = row_count;
  return v_row_count > 0;
end;
$$;

revoke all on function public.reward_first_subscription(uuid, uuid) from public;
grant execute on function public.reward_first_subscription(uuid, uuid) to service_role;
