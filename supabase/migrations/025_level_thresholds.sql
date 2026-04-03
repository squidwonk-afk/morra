-- Level curve for UI / rewards (replaces deprecated xp_levels lookup usage).
-- Per-user XP lives in public.user_xp; morra_apply_xp_delta targets user_xp.

create table if not exists public.level_thresholds (
  level integer primary key check (level >= 1),
  xp_required integer not null check (xp_required >= 0)
);

comment on table public.level_thresholds is
  'Minimum total XP required to be considered at least this level; used by applyLevelUpRewards.';

-- Default curve: level N starts at (N-1)*100 XP (matches dashboard floor(xp/100)+1 style).
insert into public.level_thresholds (level, xp_required)
select g, (g - 1) * 100
from generate_series(1, 500) as g
on conflict (level) do nothing;

alter table public.level_thresholds enable row level security;

-- Atomic XP increment: canonical store is user_xp (not deprecated xp_levels).
create or replace function public.morra_apply_xp_delta(p_user_id uuid, p_delta integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new integer;
begin
  if p_delta = 0 then
    select xp into v_new from public.user_xp where user_id = p_user_id;
    if v_new is null then
      raise exception 'user_xp row missing for user %', p_user_id;
    end if;
    return v_new;
  end if;

  update public.user_xp
  set xp = xp + p_delta
  where user_id = p_user_id
  returning xp into v_new;

  if v_new is null then
    raise exception 'user_xp row missing for user %', p_user_id;
  end if;

  return v_new;
end;
$$;

revoke all on function public.morra_apply_xp_delta(uuid, integer) from public;
grant execute on function public.morra_apply_xp_delta(uuid, integer) to service_role;
