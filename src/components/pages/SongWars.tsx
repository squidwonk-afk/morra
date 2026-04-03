"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMorraUser } from "@/contexts/MorraUserContext";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SONG_WAR_MAX_JUDGE_VARIANCE, SONGWARS_JUDGES } from "@/lib/songwars/constants";
import {
  Trophy,
  Clock,
  Users,
  Music,
  Sparkles,
  ArrowRight,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import { CREDIT_COSTS } from "@/lib/constants/credits";

type SongWarInsightPayload = {
  submissionId: string;
  title: string;
  slot_index: number;
  round: number;
  final_score: number;
  consensus_score: number;
  disagreement_score: number;
  avg_confidence_pct: number;
  judges: {
    judge_type: string;
    label: string;
    score: number;
    feedback: string;
    strengths: string[];
    weaknesses: string[];
    confidence: number;
  }[];
};

function trustLabelFromDisagreement(disagreement: number): string {
  const n = Math.min(1, disagreement / SONG_WAR_MAX_JUDGE_VARIANCE);
  if (n <= 0.15) return "Judges strongly agree";
  if (n <= 0.45) return "Some variation in opinions";
  return "Judges had mixed opinions";
}

type StandingStatus = "pending" | "qualifying" | "eliminated" | "finalist" | "winner";

type EventPayload = {
  available?: boolean;
  comingSoon?: boolean;
  noActiveEvent?: boolean;
  event: {
    id: string;
    title: string;
    status: string;
    judging_round: number;
    submissions_close_at: string;
    submissions_open_at: string;
    starts_at?: string | null;
    ends_at?: string | null;
    max_participants: number;
  };
  confirmedCount: number;
  userState: "none" | "confirmed" | "waitlist";
  submissions: { id: string; title: string; slot_index: number }[];
  submissionsOpen: boolean;
  lastEvent: {
    title: string;
    winners: { place: number; title: string; userId: string; displayName?: string | null }[];
  } | null;
  engagement?: {
    standingsTop: {
      rank: number;
      previous_rank: number | null;
      submissionId: string;
      title: string;
      score: number | null;
      status: StandingStatus;
      userId: string;
    }[];
    yourPosition: {
      rank: number;
      previous_rank: number | null;
      movement: number | null;
      status: StandingStatus;
      score: number | null;
      submissionId: string;
      title: string;
      engagementHint: string;
    } | null;
    totalSubmissions: number;
    tracksEntered: number;
  };
  rules?: {
    maxParticipants: number;
    maxSubmissionsPerUser: number;
    prizeCreditsPaid: number[];
    prizeCreditsFree: number[];
  };
};

function msToCountdown(targetIso: string): string {
  const t = new Date(targetIso).getTime() - Date.now();
  if (t <= 0) return "Closed";
  const d = Math.floor(t / 86400000);
  const h = Math.floor((t % 86400000) / 3600000);
  const m = Math.floor((t % 3600000) / 60000);
  const s = Math.floor((t % 60000) / 1000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function buildLyricsPrefillFromInsight(insight: SongWarInsightPayload): string {
  const lines: string[] = [
    `Context: Song Wars feedback for “${insight.title}” (round ${insight.round}, score ${ Number(insight.final_score).toFixed(1) }).`,
    "",
    "Please help me improve my lyrics using the judge notes below.",
    "",
  ];
  for (const j of insight.judges) {
    lines.push(`## ${j.label} (${j.score})`, j.feedback, "");
    if (j.strengths.length) {
      lines.push("Strengths:", ...j.strengths.map((s) => `- ${s}`), "");
    }
    if (j.weaknesses.length) {
      lines.push("Weaknesses:", ...j.weaknesses.map((s) => `- ${s}`), "");
    }
  }
  return lines.join("\n");
}

async function logSongWarsConversion(entries: unknown[]): Promise<void> {
  try {
    await fetch("/api/conversion/log", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries }),
    });
  } catch {
    /* non-blocking */
  }
}

function standingStatusBadgeClass(status: StandingStatus): string {
  const map: Record<StandingStatus, string> = {
    pending: "bg-[#2A2A2A] text-[#A0A0A0] border-[#404040]",
    qualifying: "bg-[#00FF94]/12 text-[#00FF94] border-[#00FF94]/35",
    eliminated: "bg-[#3A2525]/60 text-[#D09090] border-[#503030]/45",
    finalist: "bg-[#E0B040]/14 text-[#E8E8A8] border-[#E0B040]/38",
    winner: "bg-[#00FF94]/20 text-[#00FF94] border-[#00FF94]/55",
  };
  return map[status] ?? map.pending;
}

export function SongWars() {
  const router = useRouter();
  const { me, refresh } = useMorraUser();
  const viewedResultsLoggedRef = useRef(false);
  const [payload, setPayload] = useState<EventPayload | null>(null);
  const [featureUnavailable, setFeatureUnavailable] = useState(false);
  const [emptyEvent, setEmptyEvent] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [joinBusy, setJoinBusy] = useState(false);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [form, setForm] = useState({ title: "", track_url: "", lyrics: "", slot_index: 1 });
  const [insights, setInsights] = useState<SongWarInsightPayload[] | null>(null);
  const [insightsErr, setInsightsErr] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/songwars/event", { credentials: "include", cache: "no-store" });
      const j = (await r.json()) as EventPayload & { ok?: boolean; error?: string; event?: EventPayload["event"] | null };
      if (!r.ok || j.available === false || j.comingSoon) {
        setFeatureUnavailable(true);
        setEmptyEvent(false);
        setLoadErr(null);
        setPayload(null);
        return;
      }
      setFeatureUnavailable(false);
      if (j.noActiveEvent || !j.event) {
        setEmptyEvent(true);
        setLoadErr(null);
        setPayload(null);
        return;
      }
      setEmptyEvent(false);
      setLoadErr(null);
      const next = j as EventPayload;
      setPayload((prev) => {
        if (prev && JSON.stringify(prev) === JSON.stringify(next)) return prev;
        return next;
      });
    } catch {
      setFeatureUnavailable(false);
      setEmptyEvent(false);
      setLoadErr("Something went wrong. Please try again.");
      setPayload(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 15000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!payload?.event?.id) return;
    const id = setInterval(() => void load(), 22000);
    return () => clearInterval(id);
  }, [payload?.event?.id, load]);

  useEffect(() => {
    if (!payload) return;
    if (payload.userState !== "confirmed" || !payload.submissions?.length) {
      setInsights(null);
      setInsightsErr(null);
      return;
    }
    if (payload.event.status === "submissions_open" && payload.submissionsOpen) {
      setInsights(null);
      setInsightsErr(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch("/api/songwars/insights", {
          credentials: "include",
          cache: "no-store",
        });
        const j = (await r.json()) as {
          insights?: SongWarInsightPayload[];
          error?: string;
          available?: boolean;
          comingSoon?: boolean;
        };
        if (cancelled) return;
        if (j.available === false || j.comingSoon) {
          setInsightsErr(null);
          setInsights(null);
          return;
        }
        if (!r.ok) {
          setInsightsErr(j.error || "Could not load AI breakdown");
          setInsights(null);
          return;
        }
        setInsightsErr(null);
        setInsights(j.insights ?? []);
      } catch {
        if (!cancelled) {
          setInsightsErr("Could not load AI breakdown");
          setInsights(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [payload]);

  useEffect(() => {
    if (!me?.user?.id || !insights?.length) return;
    if (viewedResultsLoggedRef.current) return;
    viewedResultsLoggedRef.current = true;
    void logSongWarsConversion([
      {
        type: "funnel",
        event_type: "viewed_results",
        metadata: { source: "songwars", count: insights.length },
      },
      {
        type: "upgrade_trigger",
        trigger_type: "viewed_results",
        metadata: { source: "songwars" },
      },
    ]);
  }, [me?.user?.id, insights]);

  const insightBySubmissionId = useMemo(() => {
    if (!insights) return new Map<string, SongWarInsightPayload>();
    return new Map(insights.map((i) => [i.submissionId, i]));
  }, [insights]);

  const showInsightsShell =
    payload?.userState === "confirmed" &&
    Boolean(payload.submissions?.length) &&
    (payload.event.status !== "submissions_open" || !payload.submissionsOpen);

  const showEngagementBlock = Boolean(
    payload?.engagement &&
      (payload.engagement.tracksEntered ?? 0) > 0 &&
      !(payload.event.status === "submissions_open" && payload.submissionsOpen)
  );

  const hasYourPositionCard = Boolean(
    payload?.userState === "confirmed" && payload?.engagement?.yourPosition
  );

  const countdown = useMemo(() => {
    if (!payload?.event?.submissions_close_at) return "";
    return msToCountdown(payload.event.submissions_close_at);
  }, [payload, tick]);

  const eventEndsCountdown = useMemo(() => {
    const ends = payload?.event?.ends_at;
    if (!ends) return "";
    return msToCountdown(ends);
  }, [payload, tick]);

  async function join() {
    if (!me?.user) {
      toast.error("Sign in required");
      return;
    }
    setJoinBusy(true);
    try {
      const r = await fetch("/api/songwars/join", { method: "POST", credentials: "include" });
      const j = (await r.json()) as { ok?: boolean; state?: string; error?: string };
      if (!r.ok) {
        toast.error(j.error || "Join failed");
        return;
      }
      toast.success(j.state === "waitlist" ? "You're on the waitlist for the next event." : "You're in!");
      await load();
      await refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setJoinBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!me?.user) return;
    setSubmitBusy(true);
    try {
      const r = await fetch("/api/songwars/submit", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          track_url: form.track_url.trim(),
          lyrics: form.lyrics.trim() || undefined,
          slot_index: form.slot_index,
        }),
      });
      const j = (await r.json()) as { ok?: boolean; error?: string };
      if (!r.ok) {
        toast.error(j.error || "Submit failed");
        return;
      }
      toast.success("Track submitted");
      setForm({ title: "", track_url: "", lyrics: "", slot_index: Math.min(3, form.slot_index + 1) });
      await load();
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitBusy(false);
    }
  }

  const paid = me?.user?.subscriptionStatus === "active";
  const creditBalance = me?.credits?.balance ?? 0;
  const lyricsRunCost = CREDIT_COSTS.lyrics;
  const canRunLyricsTool = Boolean(me?.user?.isGod) || creditBalance >= lyricsRunCost;

  const prizes = paid
    ? payload?.rules?.prizeCreditsPaid ?? [600, 300, 150]
    : payload?.rules?.prizeCreditsFree ?? [300, 150, 75];

  if (featureUnavailable) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 px-4">
        <Trophy className="mx-auto text-[#00FF94] mb-4" size={48} />
        <h1 className="text-3xl font-bold text-white mb-2">Song Wars</h1>
        <p className="text-[#A0A0A0] mb-8">Coming soon</p>
        <p className="text-sm text-[#707070] mb-8 leading-relaxed">
          This competition isn&apos;t available in your environment yet (data not configured). Check back later.
        </p>
        <Link href="/app" className="text-[#00FF94] hover:underline font-medium">
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (emptyEvent) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 px-4">
        <Trophy className="mx-auto text-[#00FF94] mb-4" size={48} />
        <h1 className="text-3xl font-bold text-white mb-2">Song Wars</h1>
        <p className="text-xl text-[#E0E0E0] mb-3">No active events yet</p>
        <p className="text-sm text-[#707070] leading-relaxed">
          When the next tournament opens, you&apos;ll be able to join and submit tracks from this page.
        </p>
        <Link href="/app" className="inline-block mt-10 text-[#00FF94] hover:underline font-medium">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-10">
        <h1 className="text-4xl md:text-5xl font-bold mb-3 flex items-center gap-3">
          <Trophy className="text-[#00FF94]" size={40} />
          <span>
            <span className="text-[#00FF94]">Song</span> Wars
          </span>
        </h1>
        <p className="text-lg text-[#A0A0A0] max-w-2xl">
          Bi-weekly tournament. Up to 30 artists per event; overflow joins a fair queue for the next one.
          Four AI judges score anonymously—see Terms for disclaimers.
        </p>
      </div>

      {loadErr ? (
        <p className="text-[#E0A0A0] mb-6 rounded-xl border border-[#FF6B00]/25 bg-[#FF6B00]/10 px-4 py-3 text-sm">
          {loadErr}
        </p>
      ) : null}

      {payload?.lastEvent?.winners?.length ? (
        <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-[#00FF94]/10 to-[#9BFF00]/8 border border-[#00FF94]/35">
          <h2 className="text-lg font-bold text-[#00FF94] mb-2 flex items-center gap-2">
            <Sparkles size={20} />
            Last podium — {payload.lastEvent.title}
          </h2>
          <ul className="space-y-2 text-[#E0E0E0]">
            {payload.lastEvent.winners.map((w) => (
              <li key={`${w.place}-${w.title}`}>
                <span className="text-[#00FF94] font-semibold">{w.place}.</span> {w.title}
                {w.displayName ? (
                  <span className="text-[#707070] text-sm"> — {w.displayName}</span>
                ) : null}
              </li>
            ))}
          </ul>
          <Link
            href="/app/songwars/leaderboard"
            className="inline-flex items-center gap-2 mt-4 text-sm text-[#00FF94] hover:underline"
          >
            Global leaderboard <ArrowRight size={16} />
          </Link>
        </div>
      ) : null}

      {payload ? (
        <div className="grid gap-6 mb-10">
          <div className="p-6 rounded-2xl bg-[#121212] border border-[#00FF94]/20">
            <div className="flex flex-wrap gap-6 items-start justify-between">
              <div>
                <p className="text-sm text-[#707070] mb-1">Current event</p>
                <p className="text-2xl font-bold">{payload.event.title}</p>
                <p className="text-sm text-[#A0A0A0] mt-2 capitalize">Status: {payload.event.status}</p>
                {payload.event.status === "judging" ? (
                  <p className="text-sm text-[#E0B040] mt-1">
                    Judging round {payload.event.judging_round || 1}+ in progress
                  </p>
                ) : null}
              </div>
              <div className="text-right space-y-3">
                <div>
                  <p className="text-sm text-[#707070] mb-1 flex items-center justify-end gap-2">
                    <Clock size={16} className="text-[#00FF94]" />
                    Submissions {payload.submissionsOpen ? "close in" : "closed"}
                  </p>
                  <p className="text-3xl font-bold text-[#00FF94] transition-all duration-500">{countdown}</p>
                </div>
                {payload.event.ends_at ? (
                  <div className="pt-2 border-t border-[#00FF94]/15">
                    <p className="text-xs text-[#707070] mb-0.5 flex items-center justify-end gap-1.5">
                      <Activity size={14} className="text-[#00FF94]/80" />
                      Event ends in
                    </p>
                    <p className="text-lg font-semibold text-[#C8C8C8] transition-all duration-500 tabular-nums">
                      {eventEndsCountdown}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-4 mt-6 text-sm text-[#A0A0A0]">
              <span className="flex items-center gap-2">
                <Users size={16} className="text-[#00FF94]" />
                {payload.confirmedCount}/{payload.event.max_participants} artists
              </span>
              <span className="flex items-center gap-2">
                <Music size={16} className="text-[#00FF94]" />
                Up to {payload.rules?.maxSubmissionsPerUser ?? 3} songs each
              </span>
            </div>
          </div>

          {showEngagementBlock ? (
            <div
              className={`grid gap-4 ${hasYourPositionCard ? "md:grid-cols-2" : ""}`}
            >
              {hasYourPositionCard && payload.engagement?.yourPosition ? (
                <div className="p-6 rounded-2xl bg-[#121212] border border-[#00FF94]/25 shadow-[0_0_24px_-12px_rgba(0,255,148,0.35)]">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[#707070] mb-3">Your position</p>
                  <div className="flex flex-wrap items-end gap-4">
                    <div
                      className="tabular-nums transition-all duration-500 ease-out"
                      key={payload.engagement.yourPosition.rank}
                    >
                      <span className="text-4xl font-bold text-[#00FF94]">
                        #{payload.engagement.yourPosition.rank}
                      </span>
                      <span className="text-sm text-[#707070] ml-2">
                        / {payload.engagement.totalSubmissions || "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm">
                      {payload.engagement.yourPosition.movement != null &&
                      payload.engagement.yourPosition.movement !== 0 ? (
                        payload.engagement.yourPosition.movement > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[#4ADE80]">
                            <TrendingUp size={18} aria-hidden />
                            +{payload.engagement.yourPosition.movement}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[#F87171]">
                            <TrendingDown size={18} aria-hidden />
                            {payload.engagement.yourPosition.movement}
                          </span>
                        )
                      ) : (
                        <span className="text-[#707070] text-xs">No change yet</span>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-md border ${standingStatusBadgeClass(
                        payload.engagement.yourPosition.status
                      )}`}
                    >
                      {payload.engagement.yourPosition.status}
                    </span>
                    {payload.engagement.yourPosition.score != null ? (
                      <span className="text-xs text-[#A0A0A0]">
                        Score {payload.engagement.yourPosition.score.toFixed(1)}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-[#A0A0A0] mt-3 leading-relaxed">
                    {payload.engagement.yourPosition.engagementHint}
                  </p>
                  <p className="text-[11px] text-[#707070] mt-2 truncate" title={payload.engagement.yourPosition.title}>
                    Best track: {payload.engagement.yourPosition.title}
                  </p>
                </div>
              ) : null}

              <div
                className={`p-6 rounded-2xl bg-[#121212] border border-[#00FF94]/20 ${hasYourPositionCard ? "" : "md:max-w-2xl"}`}
              >
                <div className="flex items-center justify-between gap-2 mb-4">
                  <h3 className="font-bold text-[#00FF94] text-sm uppercase tracking-wide">Live standings</h3>
                  <span className="text-[10px] text-[#707070]">Top 10 · updates with judging</span>
                </div>
                {payload.engagement!.standingsTop.length === 0 ? (
                  <p className="text-sm text-[#707070]">
                    Board fills in once submissions are scored—check back after judging runs.
                  </p>
                ) : (
                  <ol className="space-y-2">
                    {payload.engagement!.standingsTop.map((row, idx) => {
                      const you =
                        me?.user?.id && row.userId === me.user.id;
                      const moved =
                        row.previous_rank != null && row.previous_rank !== row.rank
                          ? row.previous_rank - row.rank
                          : null;
                      return (
                        <li
                          key={row.submissionId}
                          className={`flex items-start justify-between gap-3 rounded-lg px-3 py-2.5 transition-all duration-300 ${
                            you
                              ? "bg-[#00FF94]/10 ring-1 ring-[#00FF94]/35"
                              : "bg-[#0A0A0A]/50"
                          }`}
                          style={{ animationDelay: `${idx * 40}ms` }}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <span
                              className="text-lg font-bold text-[#00FF94] w-7 shrink-0 tabular-nums transition-all duration-500"
                              key={`${row.submissionId}-${row.rank}`}
                            >
                              {row.rank}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm text-[#E0E0E0] truncate font-medium">{row.title}</p>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span
                                  className={`text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded border ${standingStatusBadgeClass(
                                    row.status
                                  )}`}
                                >
                                  {row.status}
                                </span>
                                {row.score != null ? (
                                  <span className="text-[11px] text-[#707070]">{row.score.toFixed(1)} pts</span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                          {moved != null && moved !== 0 ? (
                            moved > 0 ? (
                              <span className="inline-flex items-center text-[#4ADE80] text-xs shrink-0 tabular-nums">
                                <TrendingUp size={14} className="mr-0.5" aria-hidden />+{moved}
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-[#F87171] text-xs shrink-0 tabular-nums">
                                <TrendingDown size={14} className="mr-0.5" aria-hidden />
                                {moved}
                              </span>
                            )
                          ) : (
                            <span className="text-[10px] text-[#505050] shrink-0">—</span>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
            </div>
          ) : null}

          <div className="p-6 rounded-2xl bg-[#121212] border border-[#00FF94]/20">
            <h3 className="font-bold mb-3 text-[#00FF94]">Prize credits (top 3, per track placement)</h3>
            <p className="text-sm text-[#A0A0A0] mb-2">
              Your tier: <strong className="text-white">{paid ? "Paid subscriber" : "Free"}</strong>
            </p>
            <ul className="text-[#E0E0E0] space-y-1">
              <li>1st — {prizes[0]} credits</li>
              <li>2nd — {prizes[1]} credits</li>
              <li>3rd — {prizes[2]} credits</li>
            </ul>
          </div>

          <div className="p-6 rounded-2xl bg-[#121212] border border-[#00FF94]/20">
            <h3 className="font-bold mb-3">Judges (AI)</h3>
            <ul className="grid sm:grid-cols-2 gap-2 text-sm text-[#A0A0A0]">
              {SONGWARS_JUDGES.map((j) => (
                <li key={j.key} className="flex gap-2">
                  <span className="text-[#00FF94]">•</span> {j.label}
                </li>
              ))}
            </ul>
            <p className="text-xs text-[#707070] mt-4">
              Scores are combined as a weighted average. AI feedback is educational—not professional A&R or
              legal advice.
            </p>
          </div>
        </div>
      ) : null}

      {me?.user ? (
        <div className="space-y-6">
          {payload?.userState === "none" ? (
            <Button
              type="button"
              disabled={joinBusy}
              onClick={() => void join()}
              className="bg-[#00FF94] text-[#0A0A0A] hover:bg-[#00FF94]/90"
            >
              {joinBusy ? "Joining…" : "Join Song Wars"}
            </Button>
          ) : payload?.userState === "waitlist" ? (
            <div className="p-4 rounded-xl border border-[#E0B040]/40 bg-[#E0B040]/10 text-[#E0E0E0]">
              You&apos;re on the <strong>waitlist</strong> for the next event (FIFO). You&apos;ll be notified
              when a slot opens.
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-[#121212] border border-[#00FF94]/20">
              <p className="text-[#00FF94] font-semibold mb-4">You&apos;re confirmed</p>
              {payload?.submissions?.length ? (
                <>
                  <ul className="mb-4 text-sm text-[#A0A0A0] space-y-4">
                  {payload.submissions.map((s) => {
                    const insight = insightBySubmissionId.get(s.id);
                    return (
                      <li key={s.id} className="list-none">
                        <p>
                          Slot {s.slot_index}: {s.title}
                        </p>
                        {insight ? (
                          <div className="mt-3 pl-3 border-l border-[#00FF94]/25 space-y-4">
                            <div>
                              <p className="text-[10px] uppercase tracking-[0.12em] text-[#707070] mb-2">
                                AI breakdown
                              </p>
                              <p className="text-xs text-[#707070] mb-1">
                                Round {insight.round} · Avg. score {insight.final_score}
                              </p>
                              <p className="text-sm text-[#C8C8C8]">
                                {trustLabelFromDisagreement(insight.disagreement_score)}
                              </p>
                            </div>
                            <div className="space-y-1 max-w-md">
                              <div className="flex justify-between text-xs text-[#707070]">
                                <span>Avg. judge confidence</span>
                                <span>{insight.avg_confidence_pct.toFixed(0)}%</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-[#0A0A0A] border border-[#00FF94]/15 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-[#00FF94]/75"
                                  style={{
                                    width: `${Math.min(100, Math.max(0, insight.avg_confidence_pct))}%`,
                                  }}
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              {insight.judges.map((j) => (
                                <Collapsible
                                  key={j.judge_type}
                                  className="rounded-lg border border-[#00FF94]/12 bg-[#0A0A0A]/40 overflow-hidden"
                                >
                                  <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm text-[#E0E0E0] hover:bg-[#0A0A0A]/80 [&[data-state=open]>svg]:rotate-180">
                                    <span>
                                      <span className="text-[#00FF94] font-medium">{j.label}</span>
                                      <span className="text-[#707070]"> · </span>
                                      <span>{j.score}</span>
                                    </span>
                                    <ChevronDown className="h-4 w-4 shrink-0 text-[#707070] transition-transform duration-200" />
                                  </CollapsibleTrigger>
                                  <CollapsibleContent className="border-t border-[#00FF94]/10">
                                    <div className="px-3 py-3 space-y-3 text-sm text-[#A0A0A0] leading-relaxed">
                                      <p>{j.feedback}</p>
                                      {j.strengths.length ? (
                                        <div>
                                          <p className="text-xs uppercase tracking-wide text-[#707070] mb-1">
                                            Strengths
                                          </p>
                                          <ul className="list-disc list-inside space-y-0.5 text-[#C8C8C8]">
                                            {j.strengths.map((x, i) => (
                                              <li key={i}>{x}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      ) : null}
                                      {j.weaknesses.length ? (
                                        <div>
                                          <p className="text-xs uppercase tracking-wide text-[#707070] mb-1">
                                            Weaknesses
                                          </p>
                                          <ul className="list-disc list-inside space-y-0.5 text-[#C8C8C8]">
                                            {j.weaknesses.map((x, i) => (
                                              <li key={i}>{x}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      ) : null}
                                    </div>
                                  </CollapsibleContent>
                                </Collapsible>
                              ))}
                            </div>
                            <div className="mt-4 pt-4 border-t border-[#00FF94]/12 space-y-3 max-w-lg">
                              <p className="text-[11px] uppercase tracking-wide text-[#707070]">
                                Next step
                              </p>
                              {canRunLyricsTool ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="w-full sm:w-auto border-[#00FF94]/40 text-[#00FF94] hover:bg-[#00FF94]/10 gap-2 transition-colors duration-200"
                                  onClick={() => {
                                    const text = buildLyricsPrefillFromInsight(insight);
                                    try {
                                      sessionStorage.setItem("morra_lyrics_prefill", text);
                                    } catch {
                                      /* ignore */
                                    }
                                    void logSongWarsConversion([
                                      {
                                        type: "funnel",
                                        event_type: "clicked_improve_track_ai",
                                        metadata: { source: "songwars", submissionId: insight.submissionId },
                                      },
                                    ]);
                                    router.push("/app/lyrics");
                                  }}
                                >
                                  <Sparkles size={16} />
                                  Improve this track with AI
                                </Button>
                              ) : (
                                <div className="rounded-lg border border-[#505050]/50 bg-[#0A0A0A]/60 px-3 py-3 space-y-2">
                                  <p className="text-sm text-[#E0E0E0]">You&apos;re out of credits</p>
                                  <p className="text-xs text-[#707070]">
                                    Lyric Analyzer uses {lyricsRunCost} credits per run. You have {creditBalance}.
                                  </p>
                                  <Button
                                    asChild
                                    className="bg-[#00FF94] text-[#0A0A0A] hover:bg-[#00FF94]/90 w-full sm:w-auto"
                                  >
                                    <Link
                                      href="/app/pricing"
                                      onClick={() =>
                                        void logSongWarsConversion([
                                          {
                                            type: "funnel",
                                            event_type: "clicked_buy_credits",
                                            metadata: { source: "songwars_insufficient" },
                                          },
                                        ])
                                      }
                                    >
                                      Buy credits
                                    </Link>
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : showInsightsShell && insights !== null ? (
                          <p className="mt-2 text-xs text-[#707070]">
                            AI breakdown will appear here once this track&apos;s judging round is complete.
                          </p>
                        ) : null}
                      </li>
                    );
                  })}
                  </ul>
                  {insightsErr && showInsightsShell ? (
                    <p className="text-xs text-red-400/90 -mt-2 mb-4">{insightsErr}</p>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-[#707070] mb-4">No tracks yet.</p>
              )}

              {payload?.submissionsOpen && (payload.submissions?.length ?? 0) < 3 ? (
                <form onSubmit={(e) => void submit(e)} className="space-y-4 max-w-lg">
                  <div>
                    <Label>Slot (1–3)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={3}
                      className="mt-1 bg-[#0A0A0A] border-[#00FF94]/20"
                      value={form.slot_index}
                      onChange={(e) =>
                        setForm({ ...form, slot_index: Math.min(3, Math.max(1, Number(e.target.value) || 1)) })
                      }
                    />
                  </div>
                  <div>
                    <Label>Track title</Label>
                    <Input
                      className="mt-1 bg-[#0A0A0A] border-[#00FF94]/20"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Track URL (public http(s) link)</Label>
                    <Input
                      className="mt-1 bg-[#0A0A0A] border-[#00FF94]/20"
                      placeholder="https://soundcloud.com/…"
                      value={form.track_url}
                      onChange={(e) => setForm({ ...form, track_url: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Lyrics (optional)</Label>
                    <Textarea
                      className="mt-1 bg-[#0A0A0A] border-[#00FF94]/20 min-h-[100px]"
                      value={form.lyrics}
                      onChange={(e) => setForm({ ...form, lyrics: e.target.value })}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={submitBusy}
                    className="bg-[#00FF94] text-[#0A0A0A]"
                  >
                    {submitBusy ? "Submitting…" : "Submit track"}
                  </Button>
                </form>
              ) : !payload?.submissionsOpen ? (
                <p className="text-sm text-[#707070]">Submission window is closed for this event.</p>
              ) : (
                <p className="text-sm text-[#707070]">Maximum submissions reached.</p>
              )}
            </div>
          )}
        </div>
      ) : (
        <p className="text-[#A0A0A0]">Sign in to join Song Wars.</p>
      )}

      <div className="mt-12 text-center">
        <Link href="/app/songwars/leaderboard">
          <Button variant="outline" className="border-[#00FF94]/40 text-[#00FF94]">
            View leaderboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
