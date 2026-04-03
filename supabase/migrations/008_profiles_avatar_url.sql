-- Avatar on profiles (optional; /api/me prefers this, then artist_profiles)
alter table public.profiles
  add column if not exists avatar_url text;

comment on column public.profiles.avatar_url is 'Public URL for profile image; may mirror artist_profiles.avatar_url';
