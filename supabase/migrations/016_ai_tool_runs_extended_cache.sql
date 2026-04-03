-- Extended artist context (optional; augments profiles / artist_profiles for AI personalization)
create table if not exists public.user_profiles_extended (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  artist_name text,
  genres text[] not null default '{}'::text[],
  inspirations text,
  goals text,
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_profiles_extended_updated
  on public.user_profiles_extended (updated_at desc);

alter table public.user_profiles_extended enable row level security;

-- Tool run audit (pairs with generations; stores quality retry metadata)
create table if not exists public.tool_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  tool_type text not null,
  input_json jsonb not null default '{}'::jsonb,
  output_json jsonb not null default '{}'::jsonb,
  generation_id uuid references public.generations (id) on delete set null,
  quality_attempts smallint not null default 1 check (quality_attempts >= 1 and quality_attempts <= 8),
  from_cache boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_tool_runs_user_created
  on public.tool_runs (user_id, created_at desc);

create index if not exists idx_tool_runs_generation
  on public.tool_runs (generation_id)
  where generation_id is not null;

alter table public.tool_runs enable row level security;

-- User-saved snapshots (links to tool_runs for titles / library UX)
create table if not exists public.saved_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  tool_run_id uuid not null references public.tool_runs (id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_saved_results_user_created
  on public.saved_results (user_id, created_at desc);

alter table public.saved_results enable row level security;

-- Short-lived cache for collab / discovery (identical context + input → reuse output, no second AI call)
create table if not exists public.artist_discovery_cache (
  cache_key text primary key,
  output_json jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists idx_artist_discovery_cache_expires
  on public.artist_discovery_cache (expires_at);

alter table public.artist_discovery_cache enable row level security;
