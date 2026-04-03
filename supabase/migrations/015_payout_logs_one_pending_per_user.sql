-- At most one in-flight payout per user (prevents parallel duplicate transfers).
create unique index if not exists idx_payout_logs_one_pending_per_user
  on public.payout_logs (user_id)
  where status = 'pending';
