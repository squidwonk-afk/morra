-- Optional override for next Song Wars tournament start (UTC). If null or past, app uses computed biweekly schedule.

create table if not exists public.songwars_schedule (
  id smallint primary key default 1 check (id = 1),
  next_tournament_start timestamptz
);

insert into public.songwars_schedule (id, next_tournament_start)
values (1, null)
on conflict (id) do nothing;

alter table public.songwars_schedule enable row level security;
