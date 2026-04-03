"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { displayUsername } from "@/lib/profile/username";
import { Trophy, ArrowLeft } from "lucide-react";

type Row = {
  user_id: string;
  total_points: number;
  events_entered: number;
  podiums: number;
  display_name: string | null;
  username: string | null;
};

const POLL_MS = 22000;

export function SongWarsLeaderboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [viewerUserId, setViewerUserId] = useState<string | undefined>(undefined);
  const [err, setErr] = useState<string | null>(null);
  const [comingSoon, setComingSoon] = useState(false);
  const lastPayloadRef = useRef("");

  const fetchBoard = useCallback(async () => {
    try {
      const r = await fetch("/api/songwars/leaderboard", { credentials: "include", cache: "no-store" });
      const j = (await r.json()) as {
        leaderboard?: Row[];
        viewerUserId?: string;
        error?: string;
        available?: boolean;
        comingSoon?: boolean;
      };
      if (!r.ok) {
        setComingSoon(false);
        setErr(j.error || "Could not load");
        return;
      }
      if (j.available === false || j.comingSoon) {
        setComingSoon(true);
        setErr(null);
        setRows([]);
        setViewerUserId(j.viewerUserId);
        return;
      }
      setComingSoon(false);
      setErr(null);
      const nextRows = j.leaderboard ?? [];
      const payloadKey = JSON.stringify({
        rows: nextRows.map((x) => ({ ...x })),
        viewer: j.viewerUserId,
      });
      if (payloadKey !== lastPayloadRef.current) {
        lastPayloadRef.current = payloadKey;
        setRows(nextRows);
      }
      setViewerUserId(j.viewerUserId);
    } catch {
      setComingSoon(false);
      setErr("Network error");
    }
  }, []);

  useEffect(() => {
    void fetchBoard();
    const id = setInterval(() => void fetchBoard(), POLL_MS);
    return () => clearInterval(id);
  }, [fetchBoard]);

  const top10 = rows.slice(0, 10);
  const rest = rows.slice(10);

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/app/songwars" className="inline-flex items-center gap-2 text-sm text-[#00FF94] mb-6 hover:underline">
        <ArrowLeft size={16} /> Song Wars
      </Link>
      <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
        <Trophy className="text-[#00FF94]" size={36} />
        Leaderboard
      </h1>
      <p className="text-[#A0A0A0] mb-8">Cumulative points across completed events. Updates when an event finishes.</p>

      {comingSoon ? (
        <p className="text-[#A0A0A0] text-center py-12 rounded-2xl border border-[#00FF94]/15 bg-[#121212]/50">
          Coming soon, leaderboard data isn&apos;t available in this environment yet.
        </p>
      ) : null}

      {!comingSoon && err ? <p className="text-red-400">{err}</p> : null}

      {!comingSoon && !err && rows.length === 0 ? (
        <p className="text-[#707070]">No entries yet, be the first to compete.</p>
      ) : null}

      {!comingSoon && !err && top10.length > 0 ? (
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-[0.14em] text-[#00FF94]/90 font-semibold">Top 10</h2>
          <span className="text-[10px] text-[#707070]">Live refresh · ~{Math.round(POLL_MS / 1000)}s</span>
        </div>
      ) : null}

      <ol className="space-y-3">
        {top10.map((r, i) => {
          const isYou = viewerUserId && r.user_id === viewerUserId;
          return (
            <li
              key={r.user_id}
              className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ease-out ${
                isYou
                  ? "bg-[#00FF94]/8 border-[#00FF94]/45 ring-1 ring-[#00FF94]/25 shadow-[0_0_20px_-10px_rgba(0,255,148,0.45)]"
                  : "bg-[#121212] border-[#00FF94]/15"
              }`}
            >
              <div className="flex items-center gap-4 min-w-0">
                <span className="text-2xl font-bold text-[#00FF94] w-8 tabular-nums transition-transform duration-500">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold truncate">
                    {r.display_name || displayUsername(r.username) || "Artist"}
                    {isYou ? (
                      <span className="ml-2 text-[10px] uppercase tracking-wide text-[#00FF94]">You</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-[#707070]">@{displayUsername(r.username) || "—"}</p>
                </div>
              </div>
              <div className="text-right text-sm shrink-0">
                <p className="text-[#00FF94] font-bold tabular-nums">{r.total_points} pts</p>
                <p className="text-[#707070]">
                  {r.events_entered} events · {r.podiums} podiums
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      {rest.length > 0 ? (
        <>
          <div className="my-8 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#00FF94]/15" />
            <span className="text-[10px] uppercase tracking-widest text-[#707070]">Rest of field</span>
            <div className="h-px flex-1 bg-[#00FF94]/15" />
          </div>
          <ul className="space-y-2.5">
            {rest.map((r, j) => {
              const rank = 11 + j;
              const isYou = viewerUserId && r.user_id === viewerUserId;
              return (
                <li
                  key={r.user_id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-300 ${
                    isYou
                      ? "bg-[#00FF94]/6 border-[#00FF94]/35 ring-1 ring-[#00FF94]/15"
                      : "bg-[#161616] border-[#2A2A2A]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg font-semibold text-[#707070] w-7 tabular-nums">{rank}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {r.display_name || displayUsername(r.username) || "Artist"}
                        {isYou ? (
                          <span className="ml-2 text-[9px] uppercase text-[#00FF94]">You</span>
                        ) : null}
                      </p>
                      <p className="text-[11px] text-[#606060]">@{displayUsername(r.username) || "—"}</p>
                    </div>
                  </div>
                  <div className="text-right text-xs shrink-0">
                    <p className="text-[#00FF94] font-semibold tabular-nums">{r.total_points} pts</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </div>
  );
}
