import { parseModelJsonObject } from "@/lib/ai/json-parse";
import { completeWithRetryAndFallback } from "@/lib/ai/openrouter-client";
import { OPENROUTER_TEMPERATURE } from "@/lib/ai/config";
import type { SongwarsJudgeKey } from "@/lib/songwars/constants";
import { JUDGE_WEIGHTS, SONGWARS_JUDGES } from "@/lib/songwars/constants";
import { getAiProvider } from "@/lib/ai/provider";

const SYS = `You are a panel of four independent judges for an online music tournament on MORRA.
You must output ONE JSON object only (no markdown fences). Each judge gives: integer score 0-100; substantive feedback (2-4 sentences); strengths (2-4 short strings); weaknesses (2-4 short strings); confidence (number 0-1, how certain you are given text-only context).
Ground judgments in what the user supplied. Be fair, specific, and non-defamatory. Do not claim you listened to audio if only a link was given.
Forbidden: guaranteeing outcomes, legal advice, or personal attacks.`;

function roundPrompt(round: number): string {
  if (round === 1) {
    return "Round 1 (qualifying): broad A&R-style pass—hook potential, clarity of intent, market fit signals from text.";
  }
  if (round === 2) {
    return "Round 2 (deeper): technical and narrative depth—structure, sonic implications you can infer from lyrics/title, cohesion.";
  }
  return "Round 3 (final): comparative polish and momentum—memorability, identity, and release readiness from available context.";
}

export type JudgeFeedbackBlock = {
  score: number;
  feedback: string;
  strengths: string[];
  weaknesses: string[];
  /** 0–1 */
  confidence: number;
};

export type JudgeBundle = Record<SongwarsJudgeKey, JudgeFeedbackBlock>;

export function compositeScore(bundle: JudgeBundle): number {
  let sum = 0;
  for (const j of SONGWARS_JUDGES) {
    sum += Math.min(100, Math.max(0, bundle[j.key].score)) * JUDGE_WEIGHTS[j.key];
  }
  return Math.round(sum * 100) / 100;
}

export async function runFourJudges(params: {
  title: string;
  trackUrl: string;
  lyrics: string | null;
  round: number;
}): Promise<JudgeBundle> {
  if (getAiProvider() !== "openrouter") {
    const base = 62 + (params.title.length % 12) + params.round * 3;
    const fb = (name: string) =>
      `Mock ${name}: ${params.round === 1 ? "Qualifying" : params.round === 2 ? "Deep" : "Final"} pass—structure and identity read well from the supplied text.`;
    const s = (n: number) => Math.min(98, Math.max(40, base + n));
    const block = (name: string, n: number): JudgeFeedbackBlock => ({
      score: s(n),
      feedback: fb(name),
      strengths: ["Clear intent from title", "Coherent lyrical framing"],
      weaknesses: ["Limited sonic detail from text alone", "Hook strength unverified without audio"],
      confidence: 0.72,
    });
    return {
      ar_visionary: block("A&R", 0),
      production_architect: block("Production", 1),
      lyric_analyst: block("Lyrics", 2),
      cultural_pulse: block("Culture", 3),
    };
  }

  const payload = JSON.stringify({
    title: params.title,
    trackUrl: params.trackUrl,
    lyrics: params.lyrics ?? "",
    roundInstructions: roundPrompt(params.round),
  });

  const user = `Input JSON: ${payload}

Return JSON with exactly these keys. Each value must be an object with:
"score" (0-100 int), "feedback" (string, 2-4 sentences), "strengths" (array of 2-4 short strings), "weaknesses" (array of 2-4 short strings), "confidence" (number 0-1).
Keys: ar_visionary, production_architect, lyric_analyst, cultural_pulse`;

  const raw = await completeWithRetryAndFallback({
    slot: "mixtral",
    maxTokens: 2800,
    messages: [
      { role: "system", content: SYS },
      { role: "user", content: user },
    ],
    temperature: OPENROUTER_TEMPERATURE,
  });

  const parsed = parseModelJsonObject(raw) as Record<string, unknown>;
  const out: Partial<JudgeBundle> = {};
  for (const j of SONGWARS_JUDGES) {
    const block = parsed[j.key];
    if (!block || typeof block !== "object" || Array.isArray(block)) {
      throw new Error(`Missing judge block: ${j.key}`);
    }
    const b = block as Record<string, unknown>;
    const score = Math.min(100, Math.max(0, Math.round(Number(b.score))));
    const feedback = String(b.feedback ?? "").trim();
    if (!feedback || feedback.length < 20) {
      throw new Error(`Judge ${j.key} feedback too short`);
    }
    const strengths = normalizeStringList(b.strengths, 4);
    const weaknesses = normalizeStringList(b.weaknesses, 4);
    if (strengths.length < 2) throw new Error(`Judge ${j.key} needs at least 2 strengths`);
    if (weaknesses.length < 2) throw new Error(`Judge ${j.key} needs at least 2 weaknesses`);
    let confidence = Number(b.confidence);
    if (!Number.isFinite(confidence)) confidence = 0.7;
    confidence = Math.min(1, Math.max(0, confidence));
    out[j.key] = {
      score: Number.isFinite(score) ? score : 0,
      feedback,
      strengths,
      weaknesses,
      confidence,
    };
  }
  return out as JudgeBundle;
}

function normalizeStringList(raw: unknown, maxItems: number): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => String(x ?? "").trim())
    .filter(Boolean)
    .slice(0, maxItems);
}
