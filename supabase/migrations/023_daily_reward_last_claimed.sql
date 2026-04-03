-- Rolling 24h daily reward slot on dashboard snapshot (canonical for claim gating).

alter table public.user_dashboard_state
  add column if not exists last_claimed_at timestamptz;

comment on column public.user_dashboard_state.last_claimed_at is
  'When the user last claimed the daily XP reward; at most once per 24h (server clock).';

-- Atomically reserve a claim window or report cooldown. Must run inside a transaction block on caller;
-- function uses row lock on user_dashboard_state.
create or replace function public.morra_try_daily_claim_reserve(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_cutoff timestamptz := v_now - interval '24 hours';
  v_prev timestamptz;
begin
  perform public.morra_refresh_user_dashboard_state(p_user_id);

  select last_claimed_at into v_prev
  from public.user_dashboard_state
  where user_id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'reason', 'no_row');
  end if;

  if v_prev is not null and v_prev > v_cutoff then
    return jsonb_build_object(
      'success', false,
      'reason', 'cooldown',
      'next_claim_at', v_prev + interval '24 hours',
      'previous_last', v_prev
    );
  end if;

  update public.user_dashboard_state
  set last_claimed_at = v_now,
      updated_at = v_now
  where user_id = p_user_id;

  return jsonb_build_object(
    'success', true,
    'previous_last', v_prev
  );
end;
$$;

revoke all on function public.morra_try_daily_claim_reserve(uuid) from public;
grant execute on function public.morra_try_daily_claim_reserve(uuid) to service_role;
