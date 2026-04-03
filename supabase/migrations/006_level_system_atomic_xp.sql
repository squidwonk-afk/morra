-- Per-user XP: public.user_xp (see app). Level curve: public.level_thresholds (migration 025).
-- Daily claim dedupe: reward_events + unique index (one daily_login per UTC day per user)

-- Prevent duplicate daily_login claims from racing API requests
create unique index if not exists reward_events_daily_login_one_per_utc_day
  on public.reward_events (
    user_id,
    ((created_at at time zone 'utc')::date)
  )
  where trigger_type = 'daily_login';

-- Atomic XP increment (avoids lost updates under concurrent generations / claims)
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
