import type { AIJobType } from "@/lib/ai/config";

/** Rough word count from all string values in a JSON-like object (recursive). */
export function wordCountInValue(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "string") return v.trim() ? v.trim().split(/\s+/).length : 0;
  if (typeof v === "number" || typeof v === "boolean") return 0;
  if (Array.isArray(v)) return v.reduce((n, x) => n + wordCountInValue(x), 0);
  if (typeof v === "object") {
    return Object.values(v as object).reduce((n, x) => n + wordCountInValue(x), 0);
  }
  return 0;
}

const GENERIC_PATTERNS = [
  /\bit depends\b/i,
  /\bas an ai\b/i,
  /\bhere are some (tips|ideas)\b/i,
  /\bgeneric advice\b/i,
  /\bcould be a good fit\b/i,
];

export function hasGenericFluff(text: string): boolean {
  const t = text.slice(0, 5000);
  return GENERIC_PATTERNS.some((p) => p.test(t));
}

const MIN_WORDS: Partial<Record<AIJobType, number>> = {
  bio: 280,
  captions: 120,
  rollout: 350,
  lyrics_basic: 220,
  lyrics_advanced: 400,
  cover: 280,
  collab: 320,
  assistant: 180,
};

export type QualityResult = { ok: true } | { ok: false; reason: string };

export function validateToolOutput(type: AIJobType, obj: Record<string, unknown>): QualityResult {
  const words = wordCountInValue(obj);
  const min = MIN_WORDS[type] ?? 200;

  const blob = JSON.stringify(obj).toLowerCase();
  if (hasGenericFluff(blob)) {
    return {
      ok: false,
      reason:
        "Output sounded generic or evasive. Regenerate with specific names, genres, platforms, and concrete steps tied to the user context.",
    };
  }

  switch (type) {
    case "collab": {
      const artists = obj.artistMatches;
      const ideas = obj.collabIdeas;
      if (!Array.isArray(artists) || artists.length < 5) {
        return { ok: false, reason: "Provide artistMatches array with at least 5 detailed entries." };
      }
      if (!Array.isArray(ideas) || ideas.length < 5 || ideas.length > 12) {
        return { ok: false, reason: "Provide collabIdeas array with between 5 and 10 items." };
      }
      for (const a of artists) {
        if (!a || typeof a !== "object" || Array.isArray(a)) {
          return { ok: false, reason: "Each artistMatch must be an object with required fields." };
        }
        const m = a as Record<string, unknown>;
        for (const k of [
          "artist_name",
          "genre_match_reason",
          "audience_estimate",
          "collab_potential_score",
          "why_valuable",
          "outreach_strategy",
        ]) {
          if (!(k in m) || m[k] === "" || m[k] === null) {
            return { ok: false, reason: `Each artistMatch must include non-empty ${k}.` };
          }
        }
        const score = Number(m.collab_potential_score);
        if (!Number.isFinite(score) || score < 1 || score > 10) {
          return { ok: false, reason: "collab_potential_score must be 1–10 per artist." };
        }
      }
      for (const idea of ideas) {
        if (!idea || typeof idea !== "object" || Array.isArray(idea)) {
          return { ok: false, reason: "Each collabIdea must be an object." };
        }
        const c = idea as Record<string, unknown>;
        for (const k of [
          "title",
          "detailed_concept",
          "why_it_fits",
          "execution_plan",
          "message_template",
        ]) {
          if (typeof c[k] !== "string" || !String(c[k]).trim() || String(c[k]).length < 40) {
            return {
              ok: false,
              reason: `Each collab idea needs substantive ${k} (multi-sentence where applicable).`,
            };
          }
        }
      }
      if (words < min) {
        return { ok: false, reason: `Expand collab output; need at least ~${min} words across all string fields.` };
      }
      return { ok: true };
    }
    case "rollout": {
      if (typeof obj.section_executive !== "string" || wordCountInValue(obj.section_executive) < 40) {
        return { ok: false, reason: "Include section_executive (substantive overview)." };
      }
      if (typeof obj.section_opportunities !== "string" || wordCountInValue(obj.section_opportunities) < 40) {
        return { ok: false, reason: "Include section_opportunities (audiences / narratives)." };
      }
      const phases = obj.phases;
      if (!Array.isArray(phases) || phases.length < 5) {
        return { ok: false, reason: "Provide phases array with at least 5 phases (week + focus + tasks)." };
      }
      for (const p of phases) {
        if (!p || typeof p !== "object") return { ok: false, reason: "Each phase must be an object." };
        const ph = p as Record<string, unknown>;
        if (!Array.isArray(ph.tasks) || ph.tasks.length < 2) {
          return { ok: false, reason: "Each phase needs at least 2 specific tasks." };
        }
      }
      const plat = obj.platformStrategy;
      if (!plat || typeof plat !== "object" || Array.isArray(plat)) {
        return { ok: false, reason: "Include platformStrategy object (per-platform tactics)." };
      }
      const platKeys = Object.keys(plat as object).filter((k) =>
        String((plat as Record<string, unknown>)[k] ?? "").trim().length > 20
      );
      if (platKeys.length < 3) {
        return { ok: false, reason: "platformStrategy needs at least 3 platforms with substantive tactics." };
      }
      const promos = obj.promotionIdeas;
      if (!Array.isArray(promos) || promos.length < 8) {
        return { ok: false, reason: "promotionIdeas must have at least 8 concrete strings." };
      }
      const checklist = obj.action_checklist;
      if (!Array.isArray(checklist) || checklist.length < 10) {
        return { ok: false, reason: "action_checklist must have at least 10 ordered steps." };
      }
      const risks = obj.risks_and_mitigations;
      if (!Array.isArray(risks) || risks.length < 4) {
        return { ok: false, reason: "risks_and_mitigations needs at least 4 { risk, mitigation } objects." };
      }
      const reasoning = obj.reasoning;
      if (typeof reasoning !== "string" || wordCountInValue(reasoning) < 60) {
        return { ok: false, reason: "Include reasoning string (≥60 words) explaining why this plan fits the release." };
      }
      if (words < min) {
        return { ok: false, reason: `Expand rollout; aim for at least ~${min} words in structured fields.` };
      }
      return { ok: true };
    }
    case "bio": {
      if (typeof obj.section_overview !== "string" || wordCountInValue(obj.section_overview) < 35) {
        return { ok: false, reason: "bio pack needs section_overview (2–3 short paragraphs)." };
      }
      if (typeof obj.reasoning !== "string" || wordCountInValue(obj.reasoning) < 40) {
        return { ok: false, reason: "Include reasoning (why this positioning works)." };
      }
      const ap = obj.action_plan;
      if (!Array.isArray(ap) || ap.length < 8) {
        return { ok: false, reason: "action_plan must list at least 8 actionable strings." };
      }
      if (words < min) {
        return { ok: false, reason: `Expand bio fields; target ~${min}+ words across JSON strings.` };
      }
      return { ok: true };
    }
    case "captions": {
      if (!Array.isArray(obj.posting_plan) || obj.posting_plan.length < 7) {
        return { ok: false, reason: "posting_plan needs at least 7 scheduled post ideas." };
      }
      if (words < min) {
        return { ok: false, reason: `Expand captions pack; target ~${min}+ words.` };
      }
      return { ok: true };
    }
    case "cover": {
      if (typeof obj.design_brief_for_designer !== "string" || wordCountInValue(obj.design_brief_for_designer) < 35) {
        return { ok: false, reason: "Include design_brief_for_designer for execution." };
      }
      const concepts = obj.concepts;
      if (!Array.isArray(concepts) || concepts.length < 3) {
        return { ok: false, reason: "concepts must be an array of exactly 3 rich strings." };
      }
      if (words < min) {
        return { ok: false, reason: `Expand cover direction; target ~${min}+ words.` };
      }
      return { ok: true };
    }
    case "lyrics_basic":
    case "lyrics_advanced": {
      if (typeof obj.section_overview !== "string" || wordCountInValue(obj.section_overview) < 35) {
        return { ok: false, reason: "Lyric analysis needs section_overview." };
      }
      const minImp = type === "lyrics_advanced" ? 6 : 5;
      const imp = obj.improvements;
      if (!Array.isArray(imp) || imp.length < minImp) {
        return { ok: false, reason: `improvements array needs at least ${minImp} entries.` };
      }
      const sug = (obj.flow as Record<string, unknown> | undefined)?.suggestions;
      if (!Array.isArray(sug) || sug.length < (type === "lyrics_advanced" ? 6 : 5)) {
        return { ok: false, reason: "flow.suggestions needs enough specific strings." };
      }
      if (words < min) {
        return { ok: false, reason: `Deeper lyric feedback needed (~${min}+ words).` };
      }
      return { ok: true };
    }
    case "assistant": {
      const reply = obj.reply;
      if (typeof reply !== "string" || wordCountInValue(reply) < MIN_WORDS.assistant!) {
        return { ok: false, reason: "Assistant reply must be substantive (more depth and structure)." };
      }
      return { ok: true };
    }
    default: {
      if (words < min) {
        return {
          ok: false,
          reason: `Output too shallow (~${words} words). Target at least ~${min} words across JSON string fields with concrete detail.`,
        };
      }
      return { ok: true };
    }
  }
}
