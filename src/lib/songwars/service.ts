import type { SupabaseClient } from "@supabase/supabase-js";
import { addCreditsOptimistic } from "@/lib/credits/optimistic-balance";
import { createNotification } from "@/lib/notifications";
import { logMorraError } from "@/lib/logging";
import {
  JUDGE_KEY_TO_TRANSPARENCY_TYPE,
  JUDGE_WEIGHTS,
  SONG_WAR_MAX_JUDGE_VARIANCE,
  LEADERBOARD_POINTS,
  MAX_PARTICIPANTS_DEFAULT,
  MAX_SUBMISSIONS_PER_USER,
  PRIZE_CREDITS_FREE,
  PRIZE_CREDITS_PAID,
  R1_ADVANCE_FRACTION,
  R2_ADVANCE_FRACTION,
  SONGWARS_JUDGES,
  TRANSPARENCY_TYPE_LABEL,
  TRANSPARENCY_TYPE_ORDER,
  type SongWarJudgeType,
  type SongwarsJudgeKey,
} from "@/lib/songwars/constants";
import { isSongwarsUnavailableError } from "@/lib/songwars/availability";
import { runFourJudges } from "@/lib/songwars/judge-ai";
import { validateTrackUrl } from "@/lib/songwars/urls";

/** Insert/select failed in a non-schema way (e.g. RLS) — show “no active events” instead of 500. */
export class SongWarsNoActiveEventError extends Error {
  constructor(message = "No active Song Wars event.") {
    super(message);
    this.name = "SongWarsNoActiveEventError";
  }
}

export type SongwarsEventRow = {
  id: string;
  title: string;
  status: string;
  judging_round: number;
  submissions_open_at: string;
  submissions_close_at: string;
  /** Competition window start (defaults to submissions open). */
  starts_at: string | null;
  /** Engagement countdown target (e.g. end of judging / results). */
  ends_at: string | null;
  max_participants: number;
  rewards_distributed_at: string | null;
  winners_banner: unknown | null;
  created_at: string;
};

export type SongWarStandingStatus =
  | "pending"
  | "qualifying"
  | "eliminated"
  | "finalist"
  | "winner";

export type SongWarStandingTopRow = {
  rank: number;
  previous_rank: number | null;
  submissionId: string;
  title: string;
  score: number | null;
  status: SongWarStandingStatus;
  userId: string;
};

export type SongWarYourPosition = {
  rank: number;
  previous_rank: number | null;
  /** Positive = moved up (better). */
  movement: number | null;
  status: SongWarStandingStatus;
  score: number | null;
  submissionId: string;
  title: string;
  engagementHint: string;
};

export type SongWarEngagementPayload = {
  standingsTop: SongWarStandingTopRow[];
  yourPosition: SongWarYourPosition | null;
  totalSubmissions: number;
  /** Rows in songwars_submissions (may exist before standings refresh). */
  tracksEntered: number;
};

async function isPaidUser(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("subscription_status")
    .eq("id", userId)
    .maybeSingle();
  return (data as { subscription_status?: string } | null)?.subscription_status === "active";
}

export async function ensureActiveEvent(supabase: SupabaseClient): Promise<SongwarsEventRow> {
  const { data: existing, error: selErr } = await supabase
    .from("songwars_events")
    .select("*")
    .in("status", ["submissions_open", "judging"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (selErr) {
    if (isSongwarsUnavailableError(selErr)) throw selErr;
    throw new Error(selErr.message || "Could not read Song Wars events.");
  }

  if (existing) return existing as SongwarsEventRow;

  const close = new Date();
  close.setDate(close.getDate() + 14);
  const ends = new Date(close);
  ends.setDate(ends.getDate() + 10);
  const started = new Date();

  const { data: created, error } = await supabase
    .from("songwars_events")
    .insert({
      title: "Song Wars",
      status: "submissions_open",
      judging_round: 0,
      submissions_close_at: close.toISOString(),
      starts_at: started.toISOString(),
      ends_at: ends.toISOString(),
      max_participants: MAX_PARTICIPANTS_DEFAULT,
    })
    .select("*")
    .single();

  if (error || !created) {
    if (isSongwarsUnavailableError(error)) throw error;
    throw new SongWarsNoActiveEventError(error?.message || "Could not create Song Wars event.");
  }

  await promoteWaitlistToEvent(supabase, created.id as string, created.max_participants as number);
  return created as SongwarsEventRow;
}

export async function promoteWaitlistToEvent(
  supabase: SupabaseClient,
  eventId: string,
  max: number
): Promise<number> {
  const { count: cur } = await supabase
    .from("songwars_participants")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId);

  const confirmed = cur ?? 0;
  const slots = Math.max(0, max - confirmed);
  if (slots === 0) return 0;

  const { data: waiting } = await supabase
    .from("songwars_waitlist")
    .select("user_id")
    .order("queued_at", { ascending: true })
    .limit(slots);

  if (!waiting?.length) return 0;

  let promoted = 0;
  for (const row of waiting) {
    const uid = (row as { user_id: string }).user_id;
    const { error: pErr } = await supabase.from("songwars_participants").insert({
      event_id: eventId,
      user_id: uid,
      role: "confirmed",
    });
    if (!pErr) {
      await supabase.from("songwars_waitlist").delete().eq("user_id", uid);
      await createNotification(
        supabase,
        uid,
        "system",
        "Song Wars — you're in!",
        "A spot opened for the current Song Wars. You can submit up to three tracks from the Song Wars page."
      );
      promoted++;
    }
  }
  return promoted;
}

export async function getConfirmedCount(supabase: SupabaseClient, eventId: string): Promise<number> {
  const { count } = await supabase
    .from("songwars_participants")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId);
  return count ?? 0;
}

export async function joinSongwars(
  supabase: SupabaseClient,
  userId: string
): Promise<{
  ok: true;
  state: "confirmed" | "waitlist";
  event: SongwarsEventRow;
}> {
  const event = await ensureActiveEvent(supabase);

  const { data: alreadyP } = await supabase
    .from("songwars_participants")
    .select("id")
    .eq("event_id", event.id)
    .eq("user_id", userId)
    .maybeSingle();
  if (alreadyP?.id) {
    return { ok: true, state: "confirmed", event };
  }

  const { data: onWait } = await supabase
    .from("songwars_waitlist")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (onWait?.id) {
    return { ok: true, state: "waitlist", event };
  }

  const n = await getConfirmedCount(supabase, event.id);
  const max = event.max_participants;

  if (n < max) {
    const { error } = await supabase.from("songwars_participants").insert({
      event_id: event.id,
      user_id: userId,
      role: "confirmed",
    });
    if (error) {
      if (/duplicate/i.test(error.message)) {
        return { ok: true, state: "confirmed", event };
      }
      throw new Error(error.message);
    }
    await createNotification(
      supabase,
      userId,
      "system",
      "Song Wars — joined!",
      "You're confirmed for this bi-weekly Song Wars. Submit up to three tracks before submissions close."
    );
    await upsertLeaderboardEntry(supabase, userId, { events_delta: 1 });
    return { ok: true, state: "confirmed", event };
  }

  const { error: wErr } = await supabase.from("songwars_waitlist").insert({ user_id: userId });
  if (wErr && !/duplicate/i.test(wErr.message)) {
    throw new Error(wErr.message);
  }
  await createNotification(
    supabase,
    userId,
    "system",
    "Song Wars — waitlist",
    "This event is full (30 artists). You're queued for the next Song Wars in FIFO order."
  );
  return { ok: true, state: "waitlist", event };
}

async function upsertLeaderboardEntry(
  supabase: SupabaseClient,
  userId: string,
  opts: { events_delta?: number; points_delta?: number; podiums_delta?: number }
) {
  const { data: row } = await supabase
    .from("songwars_leaderboard")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const base = row as {
    total_points?: number;
    events_entered?: number;
    podiums?: number;
  } | null;

  const next = {
    user_id: userId,
    total_points: Math.max(0, (base?.total_points ?? 0) + (opts.points_delta ?? 0)),
    events_entered: Math.max(0, (base?.events_entered ?? 0) + (opts.events_delta ?? 0)),
    podiums: Math.max(0, (base?.podiums ?? 0) + (opts.podiums_delta ?? 0)),
    updated_at: new Date().toISOString(),
  };

  await supabase.from("songwars_leaderboard").upsert(next, { onConflict: "user_id" });
}

export async function submitSongwarsTrack(
  supabase: SupabaseClient,
  userId: string,
  input: { title: string; track_url: string; lyrics?: string; slot_index: number }
): Promise<{ submissionId: string }> {
  const event = await ensureActiveEvent(supabase);
  if (event.status !== "submissions_open") {
    throw new Error("Submissions are closed for this event.");
  }
  if (new Date() >= new Date(event.submissions_close_at)) {
    throw new Error("The submission window has ended.");
  }

  const { data: part } = await supabase
    .from("songwars_participants")
    .select("id")
    .eq("event_id", event.id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!part?.id) {
    throw new Error("Join Song Wars before submitting.");
  }

  const slot = Math.floor(input.slot_index);
  if (slot < 1 || slot > MAX_SUBMISSIONS_PER_USER) {
    throw new Error(`Slot must be 1–${MAX_SUBMISSIONS_PER_USER}.`);
  }

  const title = input.title.trim();
  if (title.length < 1 || title.length > 200) {
    throw new Error("Title must be 1–200 characters.");
  }

  const v = validateTrackUrl(input.track_url);
  if (!v.ok) throw new Error(v.error);

  const { count } = await supabase
    .from("songwars_submissions")
    .select("*", { count: "exact", head: true })
    .eq("event_id", event.id)
    .eq("user_id", userId);

  if ((count ?? 0) >= MAX_SUBMISSIONS_PER_USER) {
    throw new Error(`Maximum ${MAX_SUBMISSIONS_PER_USER} songs per artist.`);
  }

  const lyrics = input.lyrics?.trim() ? input.lyrics.trim().slice(0, 12_000) : null;

  const { data: sub, error } = await supabase
    .from("songwars_submissions")
    .insert({
      event_id: event.id,
      user_id: userId,
      slot_index: slot,
      title,
      track_url: v.url,
      lyrics,
    })
    .select("id")
    .single();

  if (error) {
    if (/duplicate|unique/i.test(error.message)) {
      throw new Error("Duplicate slot or track URL for this event.");
    }
    throw new Error(error.message);
  }

  return { submissionId: sub.id as string };
}

async function loadVotesForRound(
  supabase: SupabaseClient,
  submissionIds: string[],
  round: number
): Promise<Map<string, Set<SongwarsJudgeKey>>> {
  const map = new Map<string, Set<SongwarsJudgeKey>>();
  if (!submissionIds.length) return map;
  const { data } = await supabase
    .from("songwars_judge_votes")
    .select("submission_id, judge_key")
    .in("submission_id", submissionIds)
    .eq("round", round);
  for (const row of data ?? []) {
    const sid = (row as { submission_id: string }).submission_id;
    const jk = (row as { judge_key: SongwarsJudgeKey }).judge_key;
    if (!map.has(sid)) map.set(sid, new Set());
    map.get(sid)!.add(jk);
  }
  return map;
}

async function loadTransparencyJudgeTypes(
  supabase: SupabaseClient,
  submissionIds: string[],
  round: number
): Promise<Map<string, Set<SongWarJudgeType>>> {
  const map = new Map<string, Set<SongWarJudgeType>>();
  if (!submissionIds.length) return map;
  const { data } = await supabase
    .from("song_war_judgings")
    .select("submission_id, judge_type")
    .in("submission_id", submissionIds)
    .eq("round", round);
  for (const row of data ?? []) {
    const sid = (row as { submission_id: string }).submission_id;
    const jt = (row as { judge_type: SongWarJudgeType }).judge_type;
    if (!map.has(sid)) map.set(sid, new Set());
    map.get(sid)!.add(jt);
  }
  return map;
}

function computeConsensusFromScores(scores: number[]): {
  finalScore: number;
  disagreementScore: number;
  consensusScore: number;
} {
  const n = scores.length;
  if (n === 0) {
    return { finalScore: 0, disagreementScore: 0, consensusScore: 1 };
  }
  const mean = scores.reduce((a, b) => a + b, 0) / n;
  const variance = scores.reduce((s, x) => s + (x - mean) ** 2, 0) / n;
  const normalized = Math.min(1, variance / SONG_WAR_MAX_JUDGE_VARIANCE);
  return {
    finalScore: Math.round(mean * 100) / 100,
    disagreementScore: Math.round(variance * 10000) / 10000,
    consensusScore: Math.round((1 - normalized) * 10000) / 10000,
  };
}

async function saveTransparencyJudgings(
  supabase: SupabaseClient,
  submissionId: string,
  userId: string,
  round: number,
  bundle: Awaited<ReturnType<typeof runFourJudges>>,
  existingTypes: Set<SongWarJudgeType>
) {
  for (const j of SONGWARS_JUDGES) {
    const judgeType = JUDGE_KEY_TO_TRANSPARENCY_TYPE[j.key];
    if (existingTypes.has(judgeType)) continue;
    const block = bundle[j.key];
    const { error } = await supabase.from("song_war_judgings").insert({
      submission_id: submissionId,
      user_id: userId,
      round,
      judge_type: judgeType,
      score: block.score,
      feedback: block.feedback,
      strengths: block.strengths,
      weaknesses: block.weaknesses,
      confidence: block.confidence,
    });
    if (error) throw new Error(error.message);
    existingTypes.add(judgeType);
  }
}

async function upsertSongWarResultIfComplete(
  supabase: SupabaseClient,
  submissionId: string,
  userId: string,
  round: number
) {
  const { data: rows } = await supabase
    .from("song_war_judgings")
    .select("score")
    .eq("submission_id", submissionId)
    .eq("round", round);
  if (!rows || rows.length < 4) return;
  const scores = rows.map((r) => Number((r as { score: number }).score));
  const { finalScore, disagreementScore, consensusScore } = computeConsensusFromScores(scores);
  const { error } = await supabase.from("song_war_results").upsert(
    {
      submission_id: submissionId,
      user_id: userId,
      round,
      final_score: finalScore,
      consensus_score: consensusScore,
      disagreement_score: disagreementScore,
    },
    { onConflict: "submission_id,round" }
  );
  if (error) throw new Error(error.message);
}

async function saveJudgeBundle(
  supabase: SupabaseClient,
  submissionId: string,
  userId: string,
  round: number,
  bundle: Awaited<ReturnType<typeof runFourJudges>>,
  transparencyHave: Set<SongWarJudgeType>
) {
  for (const j of SONGWARS_JUDGES) {
    const { score, feedback } = bundle[j.key];
    await supabase.from("songwars_judge_votes").insert({
      submission_id: submissionId,
      round,
      judge_key: j.key,
      score,
      feedback,
    });
  }
  await saveTransparencyJudgings(supabase, submissionId, userId, round, bundle, transparencyHave);
  await upsertSongWarResultIfComplete(supabase, submissionId, userId, round);
}

function weightedFromVotes(rows: { judge_key: string; score: number }[]): number {
  let sum = 0;
  for (const j of SONGWARS_JUDGES) {
    const r = rows.find((x) => x.judge_key === j.key);
    if (r) sum += Math.min(100, Math.max(0, r.score)) * JUDGE_WEIGHTS[j.key];
  }
  return Math.round(sum * 100) / 100;
}

function standingsSortValue(r1: number | null, r2: number | null, r3: number | null): number | null {
  if (r3 != null) return Number(r3);
  if (r2 != null) return Number(r2);
  if (r1 != null) return Number(r1);
  return null;
}

function deriveStandingStatus(args: {
  r1: number | null;
  r2: number | null;
  r3: number | null;
  final_placement: number | null;
  eliminated_after_round: number | null;
  rank: number;
  n: number;
}): SongWarStandingStatus {
  const sortScore = standingsSortValue(args.r1, args.r2, args.r3);
  if (sortScore == null) return "pending";

  if (args.final_placement != null) {
    if (args.final_placement <= 3) return "winner";
    return "finalist";
  }

  if (args.eliminated_after_round != null) return "eliminated";

  const cutoff = Math.max(1, Math.ceil(args.n * R1_ADVANCE_FRACTION));
  if (args.rank <= cutoff) return "qualifying";
  return "eliminated";
}

export function songWarEngagementHint(args: {
  rank: number;
  n: number;
  status: SongWarStandingStatus;
}): string {
  const { rank, n, status } = args;
  const cutoff = Math.max(1, Math.ceil(n * R1_ADVANCE_FRACTION));

  if (status === "winner") return "Podium finish — standout work this event.";
  if (status === "finalist") return "You reached the finals — elite company.";
  if (status === "pending") return "Scores are still settling — check back shortly.";
  if (status === "eliminated") {
    const near = cutoff + Math.max(2, Math.ceil(n * 0.08));
    if (rank <= near) return "You were close to the qualifying line — sharpen for the next round.";
    return "Out this event — thanks for bringing your best.";
  }

  const safeLine = Math.max(1, Math.floor(cutoff * 0.45));
  if (rank <= safeLine) return "Comfortably inside the qualifying band.";
  if (rank < cutoff) return "Inside qualifying — small moves on the board can matter.";
  return "On the cut line — every placement counts.";
}

async function refreshSongWarStandings(supabase: SupabaseClient, eventId: string): Promise<void> {
  const { data: event } = await supabase
    .from("songwars_events")
    .select("status")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) return;

  const { data: subs } = await supabase
    .from("songwars_submissions")
    .select(
      "id, user_id, r1_composite, r2_composite, r3_composite, eliminated_after_round, final_placement"
    )
    .eq("event_id", eventId);

  const rows = (subs ?? []) as {
    id: string;
    user_id: string;
    r1_composite: number | null;
    r2_composite: number | null;
    r3_composite: number | null;
    eliminated_after_round: number | null;
    final_placement: number | null;
  }[];

  const { data: prevRows } = await supabase
    .from("song_war_standings")
    .select("submission_id, rank")
    .eq("event_id", eventId);

  const prevRank = new Map(
    (prevRows ?? []).map((p) => [(p as { submission_id: string }).submission_id, (p as { rank: number }).rank])
  );

  const sorted = [...rows].sort((a, b) => {
    const sa = standingsSortValue(a.r1_composite, a.r2_composite, a.r3_composite);
    const sb = standingsSortValue(b.r1_composite, b.r2_composite, b.r3_composite);
    if (sa == null && sb == null) return a.id.localeCompare(b.id);
    if (sa == null) return 1;
    if (sb == null) return -1;
    if (sb !== sa) return sb - sa;
    return a.id.localeCompare(b.id);
  });

  const n = sorted.length;
  let rank = 0;
  for (const s of sorted) {
    rank += 1;
    const score = standingsSortValue(s.r1_composite, s.r2_composite, s.r3_composite);
    const status = deriveStandingStatus({
      r1: s.r1_composite,
      r2: s.r2_composite,
      r3: s.r3_composite,
      final_placement: s.final_placement,
      eliminated_after_round: s.eliminated_after_round,
      rank,
      n,
    });
    const pr = prevRank.get(s.id);
    const { error } = await supabase.from("song_war_standings").upsert(
      {
        event_id: eventId,
        submission_id: s.id,
        user_id: s.user_id,
        rank,
        previous_rank: pr ?? null,
        score: score ?? null,
        status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "submission_id" }
    );
    if (error) {
      logMorraError("cron", "song_war_standings_upsert_failed", {
        eventIdSuffix: eventId.slice(-8),
        detail: error.message,
      });
      return;
    }
  }
}

async function fetchEngagementPayload(
  supabase: SupabaseClient,
  eventId: string,
  userId: string | null
): Promise<SongWarEngagementPayload> {
  const empty: SongWarEngagementPayload = {
    standingsTop: [],
    yourPosition: null,
    totalSubmissions: 0,
    tracksEntered: 0,
  };

  const { count: tracksEntered, error: teErr } = await supabase
    .from("songwars_submissions")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId);

  if (teErr) return empty;

  const { data: topRows, error: topErr } = await supabase
    .from("song_war_standings")
    .select("rank, previous_rank, score, status, submission_id, user_id")
    .eq("event_id", eventId)
    .order("rank", { ascending: true })
    .limit(10);

  const tracks = tracksEntered ?? 0;
  if (topErr) {
    return { standingsTop: [], yourPosition: null, totalSubmissions: 0, tracksEntered: tracks };
  }

  const { count, error: cErr } = await supabase
    .from("song_war_standings")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId);

  if (cErr) {
    return { standingsTop: [], yourPosition: null, totalSubmissions: 0, tracksEntered: tracks };
  }

  const totalSubmissions = count ?? 0;
  const ids = (topRows ?? []).map((r) => (r as { submission_id: string }).submission_id);
  let titleMap = new Map<string, string>();
  if (ids.length) {
    const { data: titles } = await supabase.from("songwars_submissions").select("id, title").in("id", ids);
    titleMap = new Map(
      (titles ?? []).map((t) => [(t as { id: string }).id, (t as { title: string }).title])
    );
  }

  const standingsTop: SongWarStandingTopRow[] = (topRows ?? []).map((r) => {
    const row = r as {
      rank: number;
      previous_rank: number | null;
      score: number | null;
      status: string;
      submission_id: string;
      user_id: string;
    };
    return {
      rank: row.rank,
      previous_rank: row.previous_rank,
      submissionId: row.submission_id,
      title: titleMap.get(row.submission_id) ?? "—",
      score: row.score != null ? Number(row.score) : null,
      status: row.status as SongWarStandingStatus,
      userId: row.user_id,
    };
  });

  let yourPosition: SongWarYourPosition | null = null;
  if (userId && totalSubmissions > 0) {
    const { data: mine } = await supabase
      .from("song_war_standings")
      .select("rank, previous_rank, score, status, submission_id")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .order("rank", { ascending: true })
      .limit(3);

    const myRows = (mine ?? []) as {
      rank: number;
      previous_rank: number | null;
      score: number | null;
      status: string;
      submission_id: string;
    }[];
    if (myRows.length) {
      const best = myRows[0];
      const { data: oneTitle } = await supabase
        .from("songwars_submissions")
        .select("title")
        .eq("id", best.submission_id)
        .maybeSingle();
      const title = (oneTitle as { title?: string } | null)?.title ?? "—";
      const prev = best.previous_rank;
      const movement =
        prev != null && prev !== best.rank ? prev - best.rank : null;
      yourPosition = {
        rank: best.rank,
        previous_rank: prev,
        movement,
        status: best.status as SongWarStandingStatus,
        score: best.score != null ? Number(best.score) : null,
        submissionId: best.submission_id,
        title,
        engagementHint: songWarEngagementHint({
          rank: best.rank,
          n: totalSubmissions,
          status: best.status as SongWarStandingStatus,
        }),
      };
    }
  }

  return {
    standingsTop,
    yourPosition,
    totalSubmissions,
    tracksEntered: tracksEntered ?? 0,
  };
}

export async function runJudgingRound(
  supabase: SupabaseClient,
  eventId: string,
  round: 1 | 2 | 3
): Promise<{ judged: number; advanced?: number }> {
  const { data: event } = await supabase
    .from("songwars_events")
    .select("*")
    .eq("id", eventId)
    .single();
  if (!event) throw new Error("Event not found.");

  if (event.status === "complete" || event.rewards_distributed_at) {
    return { judged: 0 };
  }

  const now = new Date();
  if (event.status === "submissions_open" && now >= new Date(event.submissions_close_at as string)) {
    await supabase.from("songwars_events").update({ status: "judging" }).eq("id", eventId);
  }

  if (event.status === "submissions_open" && now < new Date(event.submissions_close_at as string)) {
    throw new Error("Submissions are still open; judging starts after the deadline.");
  }

  let query = supabase
    .from("songwars_submissions")
    .select("id, user_id, title, track_url, lyrics, eliminated_after_round")
    .eq("event_id", eventId);

  if (round === 1) {
    query = query.is("eliminated_after_round", null);
  } else {
    query = query.is("eliminated_after_round", null);
  }

  const { data: subs } = await query;
  const submissions = (subs ?? []) as {
    id: string;
    user_id: string;
    title: string;
    track_url: string;
    lyrics: string | null;
    eliminated_after_round: number | null;
  }[];

  if (!submissions.length) {
    return { judged: 0 };
  }

  const ids = submissions.map((s) => s.id);
  const existing = await loadVotesForRound(supabase, ids, round);
  const transparencyExisting = await loadTransparencyJudgeTypes(supabase, ids, round);

  let judged = 0;
  for (const sub of submissions) {
    const have = existing.get(sub.id) ?? new Set();
    const transHave = transparencyExisting.get(sub.id) ?? new Set<SongWarJudgeType>();
    if (have.size >= 4 && transHave.size >= 4) continue;

    const bundle = await runFourJudges({
      title: sub.title,
      trackUrl: sub.track_url,
      lyrics: sub.lyrics,
      round,
    });

    if (have.size > 0) {
      for (const j of SONGWARS_JUDGES) {
        if (!have.has(j.key)) {
          const { score, feedback } = bundle[j.key];
          await supabase.from("songwars_judge_votes").insert({
            submission_id: sub.id,
            round,
            judge_key: j.key,
            score,
            feedback,
          });
        }
      }
      await saveTransparencyJudgings(supabase, sub.id, sub.user_id, round, bundle, transHave);
      await upsertSongWarResultIfComplete(supabase, sub.id, sub.user_id, round);
    } else {
      await saveJudgeBundle(supabase, sub.id, sub.user_id, round, bundle, transHave);
    }
    judged++;
  }

  const { data: allVotes } = await supabase
    .from("songwars_judge_votes")
    .select("submission_id, judge_key, score")
    .in("submission_id", ids)
    .eq("round", round);

  const bySub = new Map<string, { judge_key: string; score: number }[]>();
  for (const v of allVotes ?? []) {
    const row = v as { submission_id: string; judge_key: string; score: number };
    if (!bySub.has(row.submission_id)) bySub.set(row.submission_id, []);
    bySub.get(row.submission_id)!.push({ judge_key: row.judge_key, score: row.score });
  }

  const scored: { id: string; composite: number }[] = [];
  for (const sid of ids) {
    const rows = bySub.get(sid);
    const composite =
      rows && rows.length >= 4 ? weightedFromVotes(rows) : 0;
    scored.push({ id: sid, composite });
  }
  scored.sort((a, b) => b.composite - a.composite);

  const col = round === 1 ? "r1_composite" : round === 2 ? "r2_composite" : "r3_composite";
  for (const s of scored) {
    await supabase.from("songwars_submissions").update({ [col]: s.composite }).eq("id", s.id);
  }

  if (round === 1 && scored.length) {
    const k = Math.max(1, Math.ceil(scored.length * R1_ADVANCE_FRACTION));
    const advanceIds = new Set(scored.slice(0, k).map((x) => x.id));
    for (const s of scored) {
      if (!advanceIds.has(s.id)) {
        await supabase
          .from("songwars_submissions")
          .update({ eliminated_after_round: 1 })
          .eq("id", s.id);
      }
    }
    await supabase.from("songwars_events").update({ judging_round: 1 }).eq("id", eventId);
    await refreshSongWarStandings(supabase, eventId);
    return { judged, advanced: k };
  }

  if (round === 2 && scored.length) {
    const k = Math.max(1, Math.ceil(scored.length * R2_ADVANCE_FRACTION));
    const advanceIds = new Set(scored.slice(0, k).map((x) => x.id));
    for (const s of scored) {
      if (!advanceIds.has(s.id)) {
        await supabase
          .from("songwars_submissions")
          .update({ eliminated_after_round: 2 })
          .eq("id", s.id);
      }
    }
    await supabase.from("songwars_events").update({ judging_round: 2 }).eq("id", eventId);
    await refreshSongWarStandings(supabase, eventId);
    return { judged, advanced: k };
  }

  if (round === 3 && scored.length) {
    let place = 1;
    for (const s of scored) {
      await supabase
        .from("songwars_submissions")
        .update({ final_placement: place })
        .eq("id", s.id);
      place++;
    }
    await supabase.from("songwars_events").update({ judging_round: 3 }).eq("id", eventId);
    await finalizeEventRewards(supabase, eventId);
    await refreshSongWarStandings(supabase, eventId);
    return { judged, advanced: scored.length };
  }

  await refreshSongWarStandings(supabase, eventId);
  return { judged };
}

async function finalizeEventRewards(supabase: SupabaseClient, eventId: string) {
  const { data: ev } = await supabase
    .from("songwars_events")
    .select("*")
    .eq("id", eventId)
    .single();
  if (!ev || ev.rewards_distributed_at) return;

  const { data: topRows } = await supabase
    .from("songwars_submissions")
    .select("id, user_id, title, final_placement, r3_composite")
    .eq("event_id", eventId)
    .not("final_placement", "is", null)
    .order("final_placement", { ascending: true })
    .limit(200);

  type Row = {
    id: string;
    user_id: string;
    title: string;
    final_placement: number;
    r3_composite: number | null;
  };
  const rows = (topRows ?? []) as Row[];

  const prizeRecipients: Row[] = [];
  const usedUsers = new Set<string>();
  for (const r of rows) {
    if (usedUsers.has(r.user_id)) continue;
    usedUsers.add(r.user_id);
    prizeRecipients.push(r);
    if (prizeRecipients.length >= 3) break;
  }

  const winners: { userId: string; place: number; title: string; credits: number }[] = [];

  for (let i = 0; i < prizeRecipients.length; i++) {
    const placeIdx = i + 1;
    const p = prizeRecipients[i];
    const paid = await isPaidUser(supabase, p.user_id);
    const credits = paid ? PRIZE_CREDITS_PAID[placeIdx - 1] : PRIZE_CREDITS_FREE[placeIdx - 1];
    try {
      await addCreditsOptimistic(supabase, p.user_id, credits);
    } catch (e) {
      logMorraError("cron", "songwars_credit_grant_failed", {
        userIdSuffix: p.user_id.slice(-8),
        detail: e instanceof Error ? e.message : String(e),
      });
    }

    await supabase.from("reward_events").insert({
      user_id: p.user_id,
      type: "usage",
      xp: 0,
      credits,
    });

    await createNotification(
      supabase,
      p.user_id,
      "system",
      `Song Wars — ${placeIdx === 1 ? "Winner" : placeIdx === 2 ? "2nd place" : "3rd place"}!`,
      `Your track "${p.title}" earned place ${placeIdx}. We added ${credits} credits to your account. AI judging is informational only—not a guarantee of quality or outcomes.`
    );

    winners.push({ userId: p.user_id, place: placeIdx, title: p.title, credits });
  }

  const bestPlacementByUser = new Map<string, number>();
  for (const r of rows) {
    const prev = bestPlacementByUser.get(r.user_id);
    const pl = r.final_placement ?? 99;
    if (prev === undefined || pl < prev) bestPlacementByUser.set(r.user_id, pl);
  }

  for (const [uid, pl] of bestPlacementByUser) {
    let pts = LEADERBOARD_POINTS.participant;
    let pod = 0;
    if (pl === 1) {
      pts = LEADERBOARD_POINTS.first;
      pod = 1;
    } else if (pl === 2) {
      pts = LEADERBOARD_POINTS.second;
      pod = 1;
    } else if (pl === 3) {
      pts = LEADERBOARD_POINTS.third;
      pod = 1;
    } else if (pl <= 10) pts = LEADERBOARD_POINTS.topTen;

    await upsertLeaderboardEntry(supabase, uid, {
      points_delta: pts,
      podiums_delta: pod,
    });
  }

  const banner = winners.map((w) => ({
    place: w.place,
    title: w.title,
    userId: w.userId,
  }));

  await supabase
    .from("songwars_events")
    .update({
      status: "complete",
      rewards_distributed_at: new Date().toISOString(),
      winners_banner: banner,
    })
    .eq("id", eventId);

  const { data: allParts } = await supabase
    .from("songwars_participants")
    .select("user_id")
    .eq("event_id", eventId);
  for (const pr of allParts ?? []) {
    const uid = (pr as { user_id: string }).user_id;
    if (winners.some((w) => w.userId === uid)) continue;
    await createNotification(
      supabase,
      uid,
      "system",
      "Song Wars — results are in",
      "Check the Song Wars page for this event's outcomes. Thanks for competing—AI scores are tools for fun and feedback, not professional A&R decisions."
    );
  }

  await ensureActiveEvent(supabase);
}

export async function getLastCompletedBanner(
  supabase: SupabaseClient
): Promise<{
  eventId: string;
  title: string;
  winners: { place: number; title: string; userId: string; displayName?: string | null }[];
} | null> {
  const { data: ev } = await supabase
    .from("songwars_events")
    .select("id, title, winners_banner")
    .eq("status", "complete")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!ev?.id) return null;
  const raw = ev.winners_banner as
    | { place: number; title: string; userId: string }[]
    | null;
  if (!raw?.length) {
    return { eventId: ev.id as string, title: (ev.title as string) ?? "Song Wars", winners: [] };
  }
  const ids = [...new Set(raw.map((w) => w.userId))];
  const { data: profs } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", ids);
  const dmap = new Map(
    (profs ?? []).map((p) => [(p as { id: string }).id, (p as { display_name?: string }).display_name])
  );
  const winners = raw.map((w) => ({
    ...w,
    displayName: dmap.get(w.userId) ?? null,
  }));
  return { eventId: ev.id as string, title: (ev.title as string) ?? "Song Wars", winners };
}

export type SongWarInsightRow = {
  submissionId: string;
  title: string;
  slot_index: number;
  round: number;
  final_score: number;
  consensus_score: number;
  disagreement_score: number;
  avg_confidence_pct: number;
  judges: {
    judge_type: SongWarJudgeType;
    label: string;
    score: number;
    feedback: string;
    strengths: string[];
    weaknesses: string[];
    confidence: number;
  }[];
};

function parseJudgingStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => String(x)).filter(Boolean);
}

/** Latest complete AI round per submission for the current event (owner-only via API). */
export async function getSongWarInsightsForUser(
  supabase: SupabaseClient,
  userId: string,
  eventId: string
): Promise<SongWarInsightRow[]> {
  const { data: subs } = await supabase
    .from("songwars_submissions")
    .select("id, title, slot_index")
    .eq("event_id", eventId)
    .eq("user_id", userId);

  const submissions = (subs ?? []) as { id: string; title: string; slot_index: number }[];
  if (!submissions.length) return [];

  const ids = submissions.map((s) => s.id);

  const { data: judgings } = await supabase
    .from("song_war_judgings")
    .select("submission_id, round, judge_type, score, feedback, strengths, weaknesses, confidence")
    .in("submission_id", ids)
    .order("round", { ascending: true });

  const { data: results } = await supabase
    .from("song_war_results")
    .select("submission_id, round, final_score, consensus_score, disagreement_score")
    .in("submission_id", ids);

  type JRow = {
    submission_id: string;
    round: number;
    judge_type: string;
    score: number;
    feedback: string;
    strengths: unknown;
    weaknesses: unknown;
    confidence: number;
  };

  const grouped = new Map<string, Map<number, JRow[]>>();
  for (const row of (judgings ?? []) as JRow[]) {
    if (!grouped.has(row.submission_id)) grouped.set(row.submission_id, new Map());
    const rm = grouped.get(row.submission_id)!;
    if (!rm.has(row.round)) rm.set(row.round, []);
    rm.get(row.round)!.push(row);
  }

  const resultsBySub = new Map<
    string,
    { round: number; final_score: number; consensus_score: number; disagreement_score: number }[]
  >();
  for (const row of (results ?? []) as {
    submission_id: string;
    round: number;
    final_score: number;
    consensus_score: number;
    disagreement_score: number;
  }[]) {
    if (!resultsBySub.has(row.submission_id)) resultsBySub.set(row.submission_id, []);
    resultsBySub.get(row.submission_id)!.push({
      round: row.round,
      final_score: Number(row.final_score),
      consensus_score: Number(row.consensus_score),
      disagreement_score: Number(row.disagreement_score),
    });
  }

  const out: SongWarInsightRow[] = [];

  for (const sub of submissions) {
    const roundMap = grouped.get(sub.id);
    if (!roundMap) continue;

    const completeRounds = [...roundMap.entries()]
      .filter(([, list]) => list.length >= 4)
      .map(([r]) => r);
    if (!completeRounds.length) continue;

    const bestRound = Math.max(...completeRounds);
    const list = roundMap.get(bestRound)!;

    const judges: SongWarInsightRow["judges"] = [];
    for (const t of TRANSPARENCY_TYPE_ORDER) {
      const j = list.find((x) => x.judge_type === t);
      if (!j) continue;
      judges.push({
        judge_type: t,
        label: TRANSPARENCY_TYPE_LABEL[t],
        score: j.score,
        feedback: j.feedback,
        strengths: parseJudgingStringArray(j.strengths),
        weaknesses: parseJudgingStringArray(j.weaknesses),
        confidence: Number(j.confidence),
      });
    }

    if (judges.length < 4) continue;

    const resList = resultsBySub.get(sub.id);
    const res = resList?.find((x) => x.round === bestRound);
    const fromScores = computeConsensusFromScores(judges.map((j) => j.score));
    const avgConf = judges.reduce((s, j) => s + j.confidence, 0) / 4;

    out.push({
      submissionId: sub.id,
      title: sub.title,
      slot_index: sub.slot_index,
      round: bestRound,
      final_score: res?.final_score ?? fromScores.finalScore,
      consensus_score: res?.consensus_score ?? fromScores.consensusScore,
      disagreement_score: res?.disagreement_score ?? fromScores.disagreementScore,
      avg_confidence_pct: Math.round(avgConf * 1000) / 10,
      judges,
    });
  }

  out.sort((a, b) => a.slot_index - b.slot_index);
  return out;
}

function normalizeEventTimes(e: SongwarsEventRow): SongwarsEventRow {
  const starts =
    e.starts_at ??
    e.submissions_open_at ??
    new Date().toISOString();
  let ends = e.ends_at;
  if (!ends) {
    const close = new Date(e.submissions_close_at).getTime();
    ends = new Date(close + 10 * 86400000).toISOString();
  }
  return { ...e, starts_at: starts, ends_at: ends };
}

export async function getEventPublicPayload(
  supabase: SupabaseClient,
  userId: string | null
): Promise<{
  event: SongwarsEventRow;
  confirmedCount: number;
  userState: "none" | "confirmed" | "waitlist";
  submissions: { id: string; title: string; slot_index: number }[];
  submissionsOpen: boolean;
  lastEvent: Awaited<ReturnType<typeof getLastCompletedBanner>>;
  engagement: SongWarEngagementPayload;
}> {
  const rawEvent = await ensureActiveEvent(supabase);
  const event = normalizeEventTimes(rawEvent as SongwarsEventRow);
  const confirmedCount = await getConfirmedCount(supabase, event.id);
  const now = new Date();
  const submissionsOpen =
    event.status === "submissions_open" && now < new Date(event.submissions_close_at);
  const lastEvent = await getLastCompletedBanner(supabase);
  const engagement = await fetchEngagementPayload(supabase, event.id as string, userId);

  let userState: "none" | "confirmed" | "waitlist" = "none";
  let submissions: { id: string; title: string; slot_index: number }[] = [];

  if (userId) {
    const { data: p } = await supabase
      .from("songwars_participants")
      .select("id")
      .eq("event_id", event.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (p?.id) userState = "confirmed";
    else {
      const { data: w } = await supabase
        .from("songwars_waitlist")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      if (w?.id) userState = "waitlist";
    }

    const { data: subs } = await supabase
      .from("songwars_submissions")
      .select("id, title, slot_index")
      .eq("event_id", event.id)
      .eq("user_id", userId);
    submissions = (subs ?? []) as { id: string; title: string; slot_index: number }[];
  }

  return { event, confirmedCount, userState, submissions, submissionsOpen, lastEvent, engagement };
}

export async function getLeaderboardRows(
  supabase: SupabaseClient,
  limit: number
): Promise<
  {
    user_id: string;
    total_points: number;
    events_entered: number;
    podiums: number;
    display_name: string | null;
    username: string | null;
  }[]
> {
  const { data } = await supabase
    .from("songwars_leaderboard")
    .select("user_id, total_points, events_entered, podiums")
    .order("total_points", { ascending: false })
    .limit(limit);

  const rows = data ?? [];
  const ids = rows.map((r) => (r as { user_id: string }).user_id);
  if (!ids.length) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .in("id", ids);

  const pmap = new Map(
    (profiles ?? []).map((p) => [
      (p as { id: string }).id,
      {
        username: (p as { username?: string }).username ?? null,
        display_name: (p as { display_name?: string }).display_name ?? null,
      },
    ])
  );

  return rows.map((r) => {
    const row = r as {
      user_id: string;
      total_points: number;
      events_entered: number;
      podiums: number;
    };
    const p = pmap.get(row.user_id);
    return {
      ...row,
      display_name: p?.display_name ?? null,
      username: p?.username ?? null,
    };
  });
}
