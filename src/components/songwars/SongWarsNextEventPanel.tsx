"use client";

import { useEffect, useReducer } from "react";
import { Clock, MapPin } from "lucide-react";
import {
  formatSongWarsCountdownLabel,
  songWarsCountdownParts,
  type SongWarsScheduleFields,
} from "@/lib/songwars/schedule-public";

type Props = {
  schedule: Pick<
    SongWarsScheduleFields,
    "next_event_start" | "next_event_label_chicago" | "schedule_timezone"
  > | null;
  /** "landing" = larger hero card; "page" = in-app empty state */
  variant?: "landing" | "page";
};

export function SongWarsNextEventPanel({ schedule, variant = "page" }: Props) {
  const [, bump] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    const id = window.setInterval(() => bump(), 1000);
    return () => window.clearInterval(id);
  }, []);

  const isLanding = variant === "landing";

  if (!schedule?.next_event_start) {
    return (
      <div
        className={
          isLanding
            ? "w-full max-w-md rounded-3xl border border-[#FF6B00]/20 bg-[#121212]/80 p-8 text-center lg:text-left"
            : "rounded-2xl border border-[#00FF94]/15 bg-[#121212]/60 p-6 text-sm text-[#707070] max-w-xl mx-auto"
        }
      >
        Next tournament time is updating…
      </div>
    );
  }

  const parts = songWarsCountdownParts(schedule.next_event_start);
  const label = formatSongWarsCountdownLabel(parts);

  return (
    <div
      className={
        isLanding
          ? "w-full max-w-md rounded-3xl border border-[#FF6B00]/30 bg-gradient-to-b from-[#1A1208]/90 to-[#0A0A0A] p-8 shadow-[0_0_60px_rgba(255,107,0,0.12)] text-center lg:text-left"
          : "rounded-2xl border border-[#00FF94]/25 bg-[#121212]/90 p-6 text-left max-w-xl mx-auto"
      }
    >
      <p
        className={
          isLanding
            ? "text-xs font-bold uppercase tracking-widest text-[#FFB86C] mb-2"
            : "text-xs font-semibold uppercase tracking-widest text-[#00FF94]/90 mb-2"
        }
      >
        Next tournament
      </p>
      <p
        className={
          isLanding ? "text-2xl font-semibold text-white mb-1 tabular-nums" : "text-xl font-bold text-white mb-1 tabular-nums"
        }
      >
        {label}
      </p>
      <p className="text-sm text-[#A0A0A0] mb-4 flex items-start gap-2">
        <Clock className="shrink-0 mt-0.5 opacity-80" size={16} aria-hidden />
        <span>{schedule.next_event_label_chicago}</span>
      </p>
      <p className="text-xs text-[#707070] flex items-center gap-1.5">
        <MapPin className="shrink-0 opacity-70" size={12} aria-hidden />
        <span>Scheduled in {schedule.schedule_timezone.replace(/_/g, " ")} (US Central)</span>
      </p>
    </div>
  );
}

/** One-line next event + live countdown under the page title (active tournament view). */
export function SongWarsScheduleSubtitle({
  next_event_start,
  next_event_label_chicago,
}: Pick<SongWarsScheduleFields, "next_event_start" | "next_event_label_chicago">) {
  const [, bump] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    const id = window.setInterval(() => bump(), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!next_event_start?.trim()) return null;

  const parts = songWarsCountdownParts(next_event_start);
  const label = formatSongWarsCountdownLabel(parts);

  return (
    <p className="text-sm text-[#707070] mt-2 max-w-2xl">
      <span className="text-[#A0A0A0]">Next tournament: </span>
      <span className="text-[#C8C8C8]">{next_event_label_chicago}</span>
      <span className="text-[#707070]"> · </span>
      <span className="tabular-nums text-[#00FF94]/90">{label}</span>
    </p>
  );
}
