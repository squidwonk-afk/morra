-- Stripe Connect Express account id on profiles (canonical + legacy column names).
alter table public.profiles
  add column if not exists stripe_account_id text;

alter table public.profiles
  add column if not exists stripe_connect_account_id text;

-- If deployments already store Connect id on stripe_connect_account_id, mirror it once.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'stripe_connect_account_id'
  ) then
    update public.profiles
    set stripe_account_id = stripe_connect_account_id
    where stripe_account_id is null
      and stripe_connect_account_id is not null;
  end if;
end $$;

create unique index if not exists idx_profiles_stripe_account_id_unique
  on public.profiles (stripe_account_id)
  where stripe_account_id is not null;
