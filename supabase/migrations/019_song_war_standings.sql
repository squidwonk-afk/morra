-- Live event standings + engagement window (starts/ends).

alter table public.songwars_events
  add column if not exists starts_at timestamptz;

alter table public.songwars_events
  add column if not exists ends_at timestamptz;

update public.songwars_events
set starts_at = coalesce(starts_at, submissions_open_at);

update public.songwars_events
set ends_at = coalesce(ends_at, submissions_close_at + interval '10 days')
where ends_at is null;

alter table public.songwars_events
  alter column starts_at set default now();

create table if not exists public.song_war_standings (
  submission_id uuid primary key references public.songwars_submissions (id) on delete cascade,
  event_id uuid not null references public.songwars_events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  rank int not null check (rank > 0),
  previous_rank int check (previous_rank is null or previous_rank > 0),
  score numeric,
  status text not null
    check (status in ('pending', 'qualifying', 'eliminated', 'finalist', 'winner')),
  updated_at timestamptz not null default now()
);

create index if not exists idx_song_war_standings_event_rank
  on public.song_war_standings (event_id, rank asc);

alter table public.song_war_standings enable row level security;
