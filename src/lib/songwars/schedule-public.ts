import { parseDate } from "@/lib/datetime/safe-date";

/** IANA zone for Song Wars tournament starts (US Central). */
export const SONG_WARS_EVENT_TZ = "America/Chicago";

export type SongWarsScheduleFields = {
  next_event_start: string;
  countdown_ms: number;
  countdown_seconds: number;
  schedule_timezone: typeof SONG_WARS_EVENT_TZ;
  next_event_label_chicago: string;
  schedule_source: "database" | "computed";
};

export function formatSongWarsEventChicago(isoUtc: string): string {
  const d = parseDate(isoUtc);
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: SONG_WARS_EVENT_TZ,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(d);
}

export type SongWarsCountdownParts = {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

/** Live countdown from server-provided ISO instant (recomputed on the client each tick). */
export function songWarsCountdownParts(
  nextEventStartIso: string | null | undefined,
  nowMs: number = Date.now()
): SongWarsCountdownParts | null {
  if (!nextEventStartIso?.trim()) return null;
  const t = parseDate(nextEventStartIso)?.getTime();
  if (t == null) return null;
  const totalMs = Math.max(0, t - nowMs);
  const days = Math.floor(totalMs / 86400000);
  const hours = Math.floor((totalMs % 86400000) / 3600000);
  const minutes = Math.floor((totalMs % 3600000) / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  return { totalMs, days, hours, minutes, seconds };
}

export function formatSongWarsCountdownLabel(parts: SongWarsCountdownParts | null): string {
  if (!parts || parts.totalMs <= 0) return "Starting soon";
  const { days, hours, minutes, seconds } = parts;
  if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

/** Parse `/api/songwars/event` schedule fields from JSON. */
export function parseSongWarsScheduleFromJson(j: Record<string, unknown>): SongWarsScheduleFields | null {
  if (typeof j.next_event_start !== "string" || !j.next_event_start.trim()) return null;
  const tz = j.schedule_timezone;
  return {
    next_event_start: j.next_event_start,
    countdown_ms: typeof j.countdown_ms === "number" ? j.countdown_ms : Number(j.countdown_ms) || 0,
    countdown_seconds:
      typeof j.countdown_seconds === "number" ? j.countdown_seconds : Number(j.countdown_seconds) || 0,
    schedule_timezone: tz === SONG_WARS_EVENT_TZ ? tz : SONG_WARS_EVENT_TZ,
    next_event_label_chicago:
      typeof j.next_event_label_chicago === "string" ? j.next_event_label_chicago : "",
    schedule_source: j.schedule_source === "database" ? "database" : "computed",
  };
}
