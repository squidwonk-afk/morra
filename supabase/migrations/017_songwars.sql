-- Song Wars tournaments (profiles-scoped user ids)

create table if not exists public.songwars_events (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Song Wars',
  status text not null default 'submissions_open'
    check (status in ('submissions_open', 'judging', 'complete')),
  judging_round smallint not null default 0 check (judging_round >= 0 and judging_round <= 3),
  submissions_open_at timestamptz not null default now(),
  submissions_close_at timestamptz not null,
  max_participants int not null default 30 check (max_participants > 0 and max_participants <= 500),
  rewards_distributed_at timestamptz,
  winners_banner jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_songwars_events_status_created
  on public.songwars_events (status, created_at desc);

alter table public.songwars_events enable row level security;

create table if not exists public.songwars_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.songwars_events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'confirmed' check (role in ('confirmed')),
  joined_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create index if not exists idx_songwars_participants_event
  on public.songwars_participants (event_id);

create index if not exists idx_songwars_participants_user
  on public.songwars_participants (user_id);

alter table public.songwars_participants enable row level security;

-- FIFO queue for next event when current is full (one row per user)
create table if not exists public.songwars_waitlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  queued_at timestamptz not null default now(),
  unique (user_id)
);

create index if not exists idx_songwars_waitlist_queued
  on public.songwars_waitlist (queued_at asc);

alter table public.songwars_waitlist enable row level security;

create table if not exists public.songwars_submissions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.songwars_events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  slot_index smallint not null check (slot_index >= 1 and slot_index <= 3),
  title text not null,
  track_url text not null,
  lyrics text,
  eliminated_after_round smallint,
  final_placement int,
  r1_composite numeric,
  r2_composite numeric,
  r3_composite numeric,
  created_at timestamptz not null default now(),
  unique (event_id, user_id, slot_index),
  unique (event_id, user_id, track_url)
);

create index if not exists idx_songwars_submissions_event_user
  on public.songwars_submissions (event_id, user_id);

alter table public.songwars_submissions enable row level security;

create table if not exists public.songwars_judge_votes (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.songwars_submissions (id) on delete cascade,
  round smallint not null check (round >= 1 and round <= 3),
  judge_key text not null
    check (judge_key in (
      'ar_visionary',
      'production_architect',
      'lyric_analyst',
      'cultural_pulse'
    )),
  score int not null check (score >= 0 and score <= 100),
  feedback text not null,
  created_at timestamptz not null default now(),
  unique (submission_id, round, judge_key)
);

create index if not exists idx_songwars_votes_submission_round
  on public.songwars_judge_votes (submission_id, round);

alter table public.songwars_judge_votes enable row level security;

create table if not exists public.songwars_leaderboard (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  total_points int not null default 0 check (total_points >= 0),
  events_entered int not null default 0 check (events_entered >= 0),
  podiums int not null default 0 check (podiums >= 0),
  updated_at timestamptz not null default now()
);

create index if not exists idx_songwars_leaderboard_points
  on public.songwars_leaderboard (total_points desc);

alter table public.songwars_leaderboard enable row level security;
