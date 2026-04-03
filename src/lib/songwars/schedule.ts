import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays } from "date-fns";
import { TZDate } from "@date-fns/tz";
import { isSongwarsUnavailableError } from "@/lib/songwars/availability";
import {
  formatSongWarsEventChicago,
  SONG_WARS_EVENT_TZ,
  type SongWarsScheduleFields,
} from "@/lib/songwars/schedule-public";

export { SONG_WARS_EVENT_TZ } from "@/lib/songwars/schedule-public";

const BIWEEKLY_DAYS = 14;
const MAX_ADVANCE_STEPS = 5200;

/**
 * Default biweekly grid origin (Friday 9:00 PM America/Chicago).
 * Override with SONG_WARS_SCHEDULE_ANCHOR_ISO (parseable ISO instant for one real event start).
 */
function defaultAnchor(): TZDate {
  return new TZDate(2020, 0, 3, 21, 0, 0, 0, SONG_WARS_EVENT_TZ);
}

function anchorFromEnv(): TZDate | null {
  const raw = process.env.SONG_WARS_SCHEDULE_ANCHOR_ISO?.trim();
  if (!raw) return null;
  try {
    return new TZDate(raw, SONG_WARS_EVENT_TZ);
  } catch {
    return null;
  }
}

/**
 * Next tournament start: biweekly Fridays at 21:00 America/Chicago, stepping 14 calendar days from anchor.
 */
export function computeNextSongWarsEventStart(now: Date = new Date()): Date {
  const anchor = anchorFromEnv() ?? defaultAnchor();
  let candidate: TZDate = anchor;
  const nowMs = now.getTime();
  let steps = 0;
  while (candidate.getTime() < nowMs && steps < MAX_ADVANCE_STEPS) {
    const stepped = addDays(candidate, BIWEEKLY_DAYS);
    candidate = new TZDate(stepped.getTime(), SONG_WARS_EVENT_TZ);
    steps++;
  }
  if (steps >= MAX_ADVANCE_STEPS) {
    return new Date(nowMs + BIWEEKLY_DAYS * 86400000);
  }
  return new Date(candidate.getTime());
}

export async function getSongWarsScheduleFields(
  supabase: SupabaseClient,
  now: Date = new Date()
): Promise<SongWarsScheduleFields> {
  const computed = computeNextSongWarsEventStart(now);
  let chosen = computed;
  let source: SongWarsScheduleFields["schedule_source"] = "computed";

  try {
    const { data, error } = await supabase
      .from("songwars_schedule")
      .select("next_tournament_start")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      if (!isSongwarsUnavailableError(error)) {
        /* optional table */
      }
    } else {
      const raw = (data as { next_tournament_start?: string | null } | null)?.next_tournament_start;
      if (raw) {
        const dbMs = new Date(raw).getTime();
        if (!Number.isNaN(dbMs) && dbMs > now.getTime()) {
          chosen = new Date(dbMs);
          source = "database";
        }
      }
    }
  } catch {
    /* ignore */
  }

  const countdownMs = Math.max(0, chosen.getTime() - now.getTime());
  return {
    next_event_start: chosen.toISOString(),
    countdown_ms: countdownMs,
    countdown_seconds: Math.floor(countdownMs / 1000),
    schedule_timezone: SONG_WARS_EVENT_TZ,
    next_event_label_chicago: formatSongWarsEventChicago(chosen.toISOString()),
    schedule_source: source,
  };
}
