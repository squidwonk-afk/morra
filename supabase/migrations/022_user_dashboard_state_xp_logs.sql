-- Denormalized dashboard snapshot + XP audit trail (visibility / analytics layer).

create table if not exists public.user_xp_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  xp_amount integer not null,
  source text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_xp_logs_user_created
  on public.user_xp_logs (user_id, created_at desc);

comment on table public.user_xp_logs is 'Append-only XP deltas for analytics; maintained by trigger on user_xp.';

create table if not exists public.user_dashboard_state (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  credits_balance integer not null default 0,
  earnings_available_cents integer not null default 0,
  earnings_pending_cents integer not null default 0,
  xp integer not null default 0,
  level integer not null default 1,
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_dashboard_state_updated
  on public.user_dashboard_state (updated_at desc);

comment on table public.user_dashboard_state is 'Cached snapshot; refreshed when credits, XP, or profile earnings change.';

-- Refresh snapshot from canonical tables (profiles.id = user_id).
create or replace function public.morra_refresh_user_dashboard_state(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_credits integer := 0;
  v_xp integer := 0;
  v_avail integer := 0;
  v_pend integer := 0;
  v_level integer;
begin
  if not exists (select 1 from public.profiles where id = p_user_id) then
    return;
  end if;

  select credits into v_credits from public.user_credits where user_id = p_user_id;
  if not found then v_credits := 0; else v_credits := coalesce(v_credits, 0); end if;

  select xp into v_xp from public.user_xp where user_id = p_user_id;
  if not found then v_xp := 0; else v_xp := coalesce(v_xp, 0); end if;

  select
    coalesce(p.earnings_available_cents, p.earnings_balance_cents, 0),
    coalesce(p.earnings_pending_cents, p.pending_balance_cents, 0)
  into v_avail, v_pend
  from public.profiles p
  where p.id = p_user_id;

  v_level := floor(v_xp / 100.0)::integer + 1;

  insert into public.user_dashboard_state (
    user_id,
    credits_balance,
    earnings_available_cents,
    earnings_pending_cents,
    xp,
    level,
    updated_at
  )
  values (
    p_user_id,
    v_credits,
    coalesce(v_avail, 0),
    coalesce(v_pend, 0),
    v_xp,
    v_level,
    now()
  )
  on conflict (user_id) do update set
    credits_balance = excluded.credits_balance,
    earnings_available_cents = excluded.earnings_available_cents,
    earnings_pending_cents = excluded.earnings_pending_cents,
    xp = excluded.xp,
    level = excluded.level,
    updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.morra_refresh_user_dashboard_state(uuid) from public;
grant execute on function public.morra_refresh_user_dashboard_state(uuid) to service_role;

-- Log XP changes (skip zero noise on insert).
create or replace function public.morra_trg_log_user_xp_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  d integer;
begin
  if tg_op = 'INSERT' then
    if coalesce(new.xp, 0) <> 0 then
      insert into public.user_xp_logs (user_id, xp_amount, source, metadata)
      values (new.user_id, new.xp, 'initial', '{}'::jsonb);
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' and new.xp is distinct from old.xp then
    d := coalesce(new.xp, 0) - coalesce(old.xp, 0);
    if d <> 0 then
      insert into public.user_xp_logs (user_id, xp_amount, source, metadata)
      values (new.user_id, d, 'delta', '{}'::jsonb);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_user_xp_log_change on public.user_xp;
create trigger trg_user_xp_log_change
  after insert or update of xp on public.user_xp
  for each row
  execute function public.morra_trg_log_user_xp_change();

-- Keep dashboard snapshot in sync.
create or replace function public.morra_trg_dashboard_from_user_credits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.morra_refresh_user_dashboard_state(new.user_id);
  return new;
end;
$$;

drop trigger if exists trg_dashboard_user_credits on public.user_credits;
create trigger trg_dashboard_user_credits
  after insert or update of credits on public.user_credits
  for each row
  execute function public.morra_trg_dashboard_from_user_credits();

create or replace function public.morra_trg_dashboard_from_user_xp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.morra_refresh_user_dashboard_state(new.user_id);
  return new;
end;
$$;

drop trigger if exists trg_dashboard_user_xp on public.user_xp;
create trigger trg_dashboard_user_xp
  after insert or update of xp, level on public.user_xp
  for each row
  execute function public.morra_trg_dashboard_from_user_xp();

create or replace function public.morra_trg_dashboard_from_profiles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.morra_refresh_user_dashboard_state(new.id);
  return new;
end;
$$;

drop trigger if exists trg_dashboard_profiles_earnings on public.profiles;
create trigger trg_dashboard_profiles_earnings
  after insert or update of
    earnings_available_cents,
    earnings_pending_cents,
    earnings_balance_cents,
    pending_balance_cents
  on public.profiles
  for each row
  execute function public.morra_trg_dashboard_from_profiles();

alter table public.user_xp_logs enable row level security;
alter table public.user_dashboard_state enable row level security;

-- Backfill existing users (best-effort).
do $$
declare
  r record;
begin
  for r in select id from public.profiles loop
    perform public.morra_refresh_user_dashboard_state(r.id);
  end loop;
end $$;
