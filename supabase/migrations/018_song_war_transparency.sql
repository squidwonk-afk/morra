-- Transparency layer: per-judge AI breakdown + consensus metrics per submission round.

create table if not exists public.song_war_judgings (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.songwars_submissions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  round smallint not null check (round >= 1 and round <= 3),
  judge_type text not null
    check (judge_type in ('ar', 'production', 'lyrics', 'culture')),
  score int not null check (score >= 0 and score <= 100),
  feedback text not null,
  strengths jsonb not null default '[]'::jsonb,
  weaknesses jsonb not null default '[]'::jsonb,
  confidence numeric not null check (confidence >= 0::numeric and confidence <= 1::numeric),
  created_at timestamptz not null default now(),
  unique (submission_id, round, judge_type)
);

create index if not exists idx_song_war_judgings_submission_round
  on public.song_war_judgings (submission_id, round);

alter table public.song_war_judgings enable row level security;

create table if not exists public.song_war_results (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.songwars_submissions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  round smallint not null check (round >= 1 and round <= 3),
  final_score numeric not null,
  consensus_score numeric not null,
  disagreement_score numeric not null,
  created_at timestamptz not null default now(),
  unique (submission_id, round)
);

create index if not exists idx_song_war_results_submission
  on public.song_war_results (submission_id);

alter table public.song_war_results enable row level security;
