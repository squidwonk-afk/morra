"use client";

import Link from "next/link";
import { useEffect, useReducer, useState } from "react";
import { Button } from "@/components/ui/button";
import { Trophy, Users, Radio, Sparkles, ArrowRight } from "lucide-react";
import { useMorraUser } from "@/contexts/MorraUserContext";
import { parseDate, toIsoStringOrNull } from "@/lib/datetime/safe-date";
import { isSongwarsSubmissionsPhaseStatus } from "@/lib/songwars/constants";

type EventPayload = {
  ok?: boolean;
  available?: boolean;
  comingSoon?: boolean;
  noActiveEvent?: boolean;
  event: {
    id: string;
    title: string;
    status: string;
    submissions_close_at: string;
    ends_at?: string | null;
    max_participants: number;
  };
  confirmedCount: number;
  submissionsOpen: boolean;
  engagement?: { totalSubmissions: number };
};

function formatCountdown(targetIso: string): string {
  const parsed = parseDate(targetIso);
  if (!parsed) return "—";
  const t = parsed.getTime() - Date.now();
  if (t <= 0) return "00:00:00";
  const days = Math.floor(t / 86400000);
  const h = Math.floor((t % 86400000) / 3600000);
  const m = Math.floor((t % 3600000) / 60000);
  const s = Math.floor((t % 60000) / 1000);
  if (days > 0) return `${days}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function SongWarsLandingHero() {
  const { me } = useMorraUser();
  const loggedIn = Boolean(me?.user);
  const [payload, setPayload] = useState<EventPayload | null>(null);
  /** Full hero (live tournament or “no event yet”); false = infrastructure coming soon. */
  const [showTournamentUi, setShowTournamentUi] = useState(false);
  /** Schema OK but no event row / creation failed — show dominant hero + message. */
  const [noActiveEventMode, setNoActiveEventMode] = useState(false);
  const [ready, setReady] = useState(false);
  const [, bumpClock] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch("/api/songwars/event", { credentials: "include", cache: "no-store" });
        const j = (await r.json()) as EventPayload & { error?: string };
        if (cancelled) return;
        const live = r.ok && j.available !== false && !j.comingSoon && Boolean(j.event);
        const idle = r.ok && j.available !== false && !j.comingSoon && j.noActiveEvent;
        if (live) {
          setPayload(j);
          setShowTournamentUi(true);
          setNoActiveEventMode(false);
        } else if (idle) {
          setPayload(null);
          setShowTournamentUi(true);
          setNoActiveEventMode(true);
        } else {
          setPayload(null);
          setShowTournamentUi(false);
          setNoActiveEventMode(false);
        }
      } catch {
        if (!cancelled) {
          setPayload(null);
          setShowTournamentUi(false);
          setNoActiveEventMode(false);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    }
    void load();
    const id = window.setInterval(() => void load(), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => bumpClock(), 1000);
    return () => window.clearInterval(id);
  }, []);

  const live = (() => {
    if (!payload?.event) return { active: false as const };
    const st = payload.event.status;
    const active =
      isSongwarsSubmissionsPhaseStatus(st) || st === "judging";
    if (!active) return { active: false as const };

    const now = Date.now();
    const closeParsed = parseDate(payload.event.submissions_close_at);
    const closeMs = closeParsed?.getTime();
    if (closeMs == null) return { active: false as const };

    if (isSongwarsSubmissionsPhaseStatus(st) && payload.submissionsOpen && now < closeMs) {
      return {
        active: true as const,
        mode: "submissions" as const,
        targetIso: payload.event.submissions_close_at,
        label: "Submissions close in",
      };
    }
    if (st === "judging") {
      const target = payload.event.ends_at ?? payload.event.submissions_close_at;
      if (!parseDate(target)) return { active: false as const };
      return {
        active: true as const,
        mode: "judging" as const,
        targetIso: target,
        label: "Event wraps in",
      };
    }
    const endsRaw = payload.event.ends_at;
    const endsMs =
      endsRaw != null && String(endsRaw).trim() !== ""
        ? parseDate(endsRaw)?.getTime() ?? closeMs
        : closeMs;
    const maxMs = Math.max(closeMs, endsMs);
    const betweenIso = toIsoStringOrNull(maxMs);
    if (!betweenIso) return { active: false as const };
    return {
      active: true as const,
      mode: "between" as const,
      targetIso: betweenIso,
      label: "Next update in",
    };
  })();

  const joinHref = loggedIn ? "/app/songwars" : "/signup";
  const totalSubs = payload?.engagement?.totalSubmissions ?? 0;
  const cap = payload?.event?.max_participants ?? 30;
  const filled = payload?.confirmedCount ?? 0;

  if (!ready) {
    return (
      <section
        id="song-wars"
        className="relative min-h-[40vh] flex items-center justify-center border-b border-[#FF6B00]/15 scroll-mt-24"
        aria-busy
      >
        <p className="text-sm text-[#707070]">Loading…</p>
      </section>
    );
  }

  if (showTournamentUi && noActiveEventMode) {
    const joinSongWars = loggedIn ? "/app/songwars" : "/signup";
    return (
      <section
        id="song-wars"
        className="relative min-h-[88vh] flex flex-col justify-center overflow-hidden border-b border-[#FF6B00]/25 scroll-mt-24"
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(255,107,0,0.35),transparent_55%),radial-gradient(ellipse_80%_50%_at_100%_50%,rgba(255,149,0,0.12),transparent_45%)]"
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-transparent to-[#0A0A0A]/90" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 w-full">
          <div className="flex flex-col lg:flex-row lg:items-center lg:gap-16 xl:gap-20">
            <div className="flex-1 text-center lg:text-left">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#FF6B00]/40 bg-[#121212] px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[#FFB86C] mb-6">
                Song Wars
              </span>
              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight mb-4 bg-gradient-to-br from-white via-[#FFD4A8] to-[#FF8C42] bg-clip-text text-transparent">
                Song Wars
              </h1>
              <p className="text-xl md:text-2xl text-[#E8E8E8] font-semibold mb-3">No active events yet</p>
              <p className="text-base md:text-lg text-[#A0A0A0] mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                The arena is ready. As soon as the next tournament opens, you&apos;ll compete with AI judges and climb
                the leaderboard, right here.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link href={joinSongWars}>
                  <Button
                    size="lg"
                    className="w-full sm:w-auto min-h-[52px] px-10 text-lg font-bold bg-gradient-to-r from-[#FF6B00] to-[#FF9500] text-[#0A0A0A] hover:opacity-95 shadow-[0_0_40px_rgba(255,107,0,0.45)] border-0"
                  >
                    Join Song Wars
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="#morra-platform">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto min-h-[52px] px-8 text-lg border-[#FF6B00]/40 text-[#FFB86C] hover:bg-[#FF6B00]/10 hover:text-white"
                  >
                    Explore MORRA
                  </Button>
                </Link>
              </div>
            </div>
            <div className="flex-1 mt-12 lg:mt-0 flex justify-center lg:justify-end">
              <div className="w-full max-w-md rounded-3xl border border-[#FF6B00]/30 bg-gradient-to-b from-[#1A1208]/90 to-[#0A0A0A] p-8 shadow-[0_0_60px_rgba(255,107,0,0.12)] text-center lg:text-left">
                <p className="text-xs font-bold uppercase tracking-widest text-[#FFB86C] mb-2">Event status</p>
                <p className="text-2xl font-semibold text-white mb-2">Waiting for launch</p>
                <p className="text-sm text-[#707070]">
                  Countdowns and live standings appear when an event is scheduled. Stay tuned.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!showTournamentUi) {
    return (
      <section
        id="song-wars"
        className="relative min-h-[48vh] flex flex-col items-center justify-center overflow-hidden border-b border-[#FF6B00]/20 scroll-mt-24 px-4"
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(255,107,0,0.12),transparent_50%)]"
          aria-hidden
        />
        <div className="relative z-10 max-w-lg text-center">
          <Trophy className="mx-auto mb-4 h-14 w-14 text-[#FF6B00]/90" strokeWidth={1.25} />
          <h2 className="text-3xl md:text-4xl font-black tracking-tight bg-gradient-to-br from-white to-[#FF8C42] bg-clip-text text-transparent mb-2">
            Song Wars
          </h2>
          <p className="text-lg text-[#A0A0A0] mb-6">Coming soon</p>
          <p className="text-sm text-[#707070] leading-relaxed">
            Tournaments aren&apos;t available in this environment yet. Check back later, the full arena, judges, and
            leaderboards will appear here automatically.
          </p>
          <div className="mt-8">
            <Link
              href="#morra-platform"
              className="text-[#00FF94] text-sm font-medium hover:underline underline-offset-4"
            >
              Explore MORRA&apos;s creative tools
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="song-wars"
      className="relative min-h-[88vh] flex flex-col justify-center overflow-hidden border-b border-[#FF6B00]/25 scroll-mt-24"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(255,107,0,0.35),transparent_55%),radial-gradient(ellipse_80%_50%_at_100%_50%,rgba(255,149,0,0.12),transparent_45%),radial-gradient(ellipse_60%_40%_at_0%_80%,rgba(255,107,0,0.08),transparent_50%)]"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-transparent to-[#0A0A0A]/90" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 w-full">
        <div className="flex flex-col lg:flex-row lg:items-stretch lg:gap-12 xl:gap-16">
          <div className="flex-1 flex flex-col justify-center text-center lg:text-left">
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mb-6">
              {payload && live.active ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-[#FF6B00]/50 bg-[#FF6B00]/15 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[#FFB86C] shadow-[0_0_24px_rgba(255,107,0,0.35)]">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF6B00] opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#FF9500]" />
                  </span>
                  Live event
                </span>
              ) : !payload ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-[#FF6B00]/35 bg-[#121212] px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#A0A0A0]">
                  <Radio className="h-3.5 w-3.5 text-[#FF6B00]" />
                  Song Wars
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full border border-[#FF6B00]/35 bg-[#121212] px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#A0A0A0]">
                  Song Wars
                </span>
              )}
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight mb-4 bg-gradient-to-br from-white via-[#FFD4A8] to-[#FF8C42] bg-clip-text text-transparent drop-shadow-[0_0_40px_rgba(255,107,0,0.25)]">
              Song Wars
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-[#E8E8E8] font-medium mb-3 max-w-xl mx-auto lg:mx-0">
              {payload?.event?.title ?? "The artist tournament"}
            </p>
            <p className="text-base md:text-lg text-[#A0A0A0] mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Up to thirty artists per round. Four AI judges. Submit tracks, climb the bracket, win credits.
              This isn&apos;t a side mode, it&apos;s why we built MORRA.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-10">
              <Link href={joinHref}>
                <Button
                  size="lg"
                  className="w-full sm:w-auto min-h-[52px] px-10 text-lg font-bold bg-gradient-to-r from-[#FF6B00] to-[#FF9500] text-[#0A0A0A] hover:opacity-95 shadow-[0_0_40px_rgba(255,107,0,0.45)] border-0"
                >
                  Join Song Wars
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              {loggedIn ? (
                <Link href="/app/songwars/leaderboard">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto min-h-[52px] px-8 text-lg border-[#FF6B00]/40 text-[#FFB86C] hover:bg-[#FF6B00]/10 hover:text-white"
                  >
                    Leaderboard
                  </Button>
                </Link>
              ) : (
                <Link href="#morra-platform">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto min-h-[52px] px-8 text-lg border-[#FF6B00]/40 text-[#FFB86C] hover:bg-[#FF6B00]/10 hover:text-white"
                  >
                    Creative tools
                  </Button>
                </Link>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 text-sm text-[#A0A0A0]">
              <span className="inline-flex items-center gap-2">
                <Users className="h-4 w-4 text-[#FF6B00]" />
                <span>
                  <span className="text-white font-semibold">{filled}</span> / {cap} spots
                </span>
              </span>
              <span className="inline-flex items-center gap-2">
                <Trophy className="h-4 w-4 text-[#FF9500]" />
                <span>
                  <span className="text-white font-semibold">{totalSubs}</span> tracks entered
                </span>
              </span>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center mt-12 lg:mt-0">
            <div className="w-full max-w-md rounded-3xl border border-[#FF6B00]/30 bg-gradient-to-b from-[#1A1208]/90 to-[#0A0A0A] p-8 shadow-[0_0_60px_rgba(255,107,0,0.12)] backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-2 text-[#FFB86C]">
                <Sparkles className="h-5 w-5" />
                <span className="text-xs font-bold uppercase tracking-widest">Event clock</span>
              </div>
              {payload && live.active && "targetIso" in live ? (
                <>
                  <p className="text-sm text-[#A0A0A0] mb-3">{live.label}</p>
                  <p
                    className="font-mono text-4xl sm:text-5xl font-bold tabular-nums text-white tracking-tight mb-2"
                    suppressHydrationWarning
                  >
                    {formatCountdown(live.targetIso)}
                  </p>
                  <p className="text-xs text-[#707070]">
                    {live.mode === "submissions"
                      ? "Lock in your tracks before the window closes."
                      : live.mode === "judging"
                        ? "Results and standings update as judges finish each round."
                        : "Hang tight, the next phase is starting soon."}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-[#A0A0A0] mb-3">Next tournament</p>
                  <p className="text-2xl font-semibold text-white mb-2">Always something brewing</p>
                  <p className="text-xs text-[#707070]">
                    Join to enter the current event and get notified when submissions open.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
