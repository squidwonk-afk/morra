-- Allow `active` as a live Song Wars event status (admin / manual seeding).
-- App treats `active` like `submissions_open` for the submission window (see isSongwarsSubmissionsPhaseStatus).

alter table public.songwars_events
  drop constraint if exists songwars_events_status_check;

alter table public.songwars_events
  add constraint songwars_events_status_check
  check (status in ('active', 'submissions_open', 'judging', 'complete'));
