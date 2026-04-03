-- Artist profiles (collab finder) + Artist services (marketplace)

-- Profiles
create table if not exists public.artist_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  username text,
  bio text,
  role text,
  styles text[] not null default '{}'::text[],
  looking_for text[] not null default '{}'::text[],
  created_at timestamp not null default now()
);

create unique index if not exists idx_artist_profiles_user_id_unique
  on public.artist_profiles (user_id);

create index if not exists idx_artist_profiles_role
  on public.artist_profiles (role);

create index if not exists idx_artist_profiles_styles_gin
  on public.artist_profiles
  using gin (styles);

create index if not exists idx_artist_profiles_looking_for_gin
  on public.artist_profiles
  using gin (looking_for);

alter table public.artist_profiles enable row level security;

-- Services (marketplace listings)
create table if not exists public.artist_services (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  description text,
  category text,
  styles text[] not null default '{}'::text[],
  price_range text,
  created_at timestamp not null default now()
);

create index if not exists idx_artist_services_user_created
  on public.artist_services (user_id, created_at desc);

create index if not exists idx_artist_services_category
  on public.artist_services (category);

create index if not exists idx_artist_services_styles_gin
  on public.artist_services
  using gin (styles);

alter table public.artist_services enable row level security;

-- Social links (contact via external apps only; no internal messaging)
create table if not exists public.artist_socials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users (id) on delete cascade,
  instagram text,
  tiktok text,
  soundcloud text,
  spotify text
);

alter table public.artist_socials enable row level security;

