"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Clock, Trophy } from "lucide-react";
import { isSongwarsSubmissionsPhaseStatus, R1_ADVANCE_FRACTION } from "@/lib/songwars/constants";

type StandingStatus = "pending" | "qualifying" | "eliminated" | "finalist" | "winner";

type EventPayload = {
  available?: boolean;
  comingSoon?: boolean;
  event: {
    status: string;
    submissions_close_at: string;
    ends_at?: string | null;
  };
  userState: "none" | "confirmed" | "waitlist";
  submissionsOpen: boolean;
  engagement?: {
    yourPosition: {
      rank: number;
      previous_rank: number | null;
      status: StandingStatus;
    } | null;
    totalSubmissions: number;
    tracksEntered: number;
  };
};

function msToShort(targetIso: string): string {
  const t = new Date(targetIso).getTime() - Date.now();
  if (t <= 0) return "Ended";
  const d = Math.floor(t / 86400000);
  const h = Math.floor((t % 86400000) / 3600000);
  const m = Math.floor((t % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function SongWarsMetricsStrip() {
  const [payload, setPayload] = useState<EventPayload | null>(null);
  const [tick, setTick] = useState(0);
  const prevRankRef = useRef<number | null>(null);
  const [rankPulse, setRankPulse] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch("/api/songwars/event", { credentials: "include", cache: "no-store" });
        const j = (await r.json()) as EventPayload & { ok?: boolean };
        if (cancelled) return;
        if (r.ok && j.available !== false && !j.comingSoon && j.event) {
          setPayload(j);
        } else {
          setPayload(null);
        }
      } catch {
        if (!cancelled) setPayload(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 45_000);
    return () => clearInterval(id);
  }, []);

  const strip = useMemo(() => {
    if (!payload) return null;
    const st = payload.event.status;
    const active = isSongwarsSubmissionsPhaseStatus(st) || st === "judging";
    if (!active) return null;
    if (payload.userState !== "confirmed") return null;

    const eng = payload.engagement;
    const n = eng?.totalSubmissions ?? 0;
    const cutoff = n > 0 ? Math.max(1, Math.ceil(n * R1_ADVANCE_FRACTION)) : null;
    const your = eng?.yourPosition;
    const targetIso = payload.submissionsOpen
      ? payload.event.submissions_close_at
      : payload.event.ends_at ?? payload.event.submissions_close_at;
    const countdown = msToShort(targetIso);

    return {
      rank: your?.rank ?? null,
      prevRank: your?.previous_rank ?? null,
      cutoff,
      n,
      countdown,
      status: your?.status ?? ("pending" as StandingStatus),
      submissionsOpen: payload.submissionsOpen,
    };
  }, [payload]);

  useEffect(() => {
    if (!strip || strip.rank == null) {
      return undefined;
    }
    const r = strip.rank;
    const prev = prevRankRef.current;
    if (prev == null) {
      prevRankRef.current = r;
      return undefined;
    }
    if (prev === r) {
      return undefined;
    }
    prevRankRef.current = r;
    if (r < prev) setRankPulse("up");
    else if (r > prev) setRankPulse("down");
    const t = window.setTimeout(() => setRankPulse(null), 1000);
    return () => clearTimeout(t);
  }, [strip]);

  useEffect(() => {
    if (!payload) prevRankRef.current = null;
  }, [payload]);

  if (!strip) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] sm:text-xs text-[#B8B8B8] border-l border-[#00FF94]/20 pl-3 ml-1">
      <span className="inline-flex items-center gap-1.5 text-[#00FF94]/90 font-medium">
        <Trophy size={13} className="shrink-0 opacity-90" aria-hidden />
        Song Wars
      </span>
      {strip.rank != null ? (
        <span
          key={strip.rank}
          className={`tabular-nums transition-all duration-500 ease-out ${
            rankPulse === "up"
              ? "text-[#4ADE80]"
              : rankPulse === "down"
                ? "text-[#F0A0A0]"
                : ""
          }`}
          title="Current board rank (best track)"
        >
          Rank <span className="text-[#E8E8E8] font-semibold">#{strip.rank}</span>
          {strip.n > 0 ? <span className="text-[#707070]"> / {strip.n}</span> : null}
        </span>
      ) : (
        <span className="text-[#707070]">Board updating</span>
      )}
      {strip.cutoff != null ? (
        <span className="text-[#909090]">
          Cutoff <span className="text-[#C8C8C8] tabular-nums">top {strip.cutoff}</span>
        </span>
      ) : null}
      <span className="inline-flex items-center gap-1 text-[#909090]">
        <Clock size={12} className="opacity-80" aria-hidden />
        <span className="tabular-nums text-[#C8C8C8] transition-opacity duration-300">{strip.countdown}</span>
      </span>
    </div>
  );
}
