-- Track profile mutations for auditing / sync.

alter table public.profiles
  add column if not exists updated_at timestamptz not null default now();

comment on column public.profiles.updated_at is 'Last update to this profile row; maintained by trigger.';

create or replace function public.morra_set_profiles_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.morra_set_profiles_updated_at();
