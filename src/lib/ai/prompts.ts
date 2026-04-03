import type { ChatMessage } from "@/lib/ai/openrouter-client";
import type { AIJobType } from "@/lib/ai/config";

const SYS_CREATIVE_JSON = `You are MORRA's senior creative director for independent musicians. You produce premium, non-generic deliverables.

STRICT RULES:
- Output ONLY one valid JSON object. No markdown fences, no prose before/after.
- Every string field must be substantial: concrete names, platforms, timelines, and tactics—not filler.
- Ground everything in the user's inputs AND any USER CONTEXT block provided.
- Include explicit reasoning (why choices fit this act) in the fields requested—never outsource reasoning to "it depends".
- Use clear structure: think in sections (overview → deep work → action plan) even inside JSON.
- Forbidden: vague ChatGPT phrases ("leverage synergy", "it is important to note", "as an AI").`;

const ASSISTANT_PLATFORM_POLICY = `Platform facts (morra.store) — answer accurately:
- Payments and subscriptions go through Stripe. MORRA does not store full card numbers.
- Users **may earn** based on referrals when rules and qualifying activity are met; this is **not** guaranteed income and **not** a promise of payouts.
- **Pending** referral amounts sit in a platform hold (about **10 days** from accrual timing) before becoming **available** to withdraw. All referral cashouts are **USD**. **Payouts are processed by Stripe and may be delayed** (including bank settlement).
- Minimum withdrawal is typically **USD $5** of **available** balance; users must connect Stripe Connect (Express) first.
- Credits are generally non-refundable except where the law requires otherwise.
- Users are responsible for their own taxes; never give tax or personalized financial advice—suggest a qualified professional.
- Never promise guaranteed earnings, specific dollar amounts, or instant withdrawals.`;

function attachContext(userBody: string, userContextBlock?: string): string {
  const c = userContextBlock?.trim();
  if (!c) return userBody;
  return `${c}\n\n---\n\n${userBody}`;
}

export function messagesForJob(
  type: AIJobType,
  input: Record<string, unknown>,
  userContextBlock?: string
): ChatMessage[] {
  switch (type) {
    case "bio":
      return messagesBio(input, userContextBlock);
    case "captions":
      return messagesCaptions(input, userContextBlock);
    case "rollout":
      return messagesRollout(input, userContextBlock);
    case "lyrics_basic":
      return messagesLyricsBasic(input, userContextBlock);
    case "lyrics_advanced":
      return messagesLyricsAdvanced(input, userContextBlock);
    case "cover":
      return messagesCover(input, userContextBlock);
    case "collab":
      return messagesCollab(input, userContextBlock);
    case "assistant":
      return messagesAssistant(input, userContextBlock);
    default:
      return messagesBio(input, userContextBlock);
  }
}

function messagesBio(input: Record<string, unknown>, ctx?: string): ChatMessage[] {
  const payload = JSON.stringify({
    name: input.name ?? "",
    genre: input.genre ?? "",
    influences: input.influences ?? "",
    mood: input.mood ?? "",
    lyrics: input.lyrics ?? "",
  });
  const body = attachContext(
    `Create a **premium** artist branding pack. Cite genre + mood + influences with specific vocabulary (no clichés).

Input JSON: ${payload}

Return JSON:
- section_overview: 2–3 short paragraphs (string) — who they are for press/skimmers.
- reasoning: 2 paragraphs (string) — why this positioning will land for this niche.
- bio: 3–5 paragraphs for DSP / website (string).
- epk: one narrative paragraph + bullet list in one string (press-ready).
- social: 6–10 one-liner hooks separated by newlines in one string.
- hashtags: one string of relevant tags.
- press: quote-ready paragraph + angle for blogs (string).
- action_plan: string[] — 8–12 actionable next steps (pitch playlists, content shoots, etc.).`,
    ctx
  );
  return [
    { role: "system", content: SYS_CREATIVE_JSON },
    { role: "user", content: body },
  ];
}

function messagesCaptions(input: Record<string, unknown>, ctx?: string): ChatMessage[] {
  const payload = JSON.stringify({
    name: input.name ?? "",
    genre: input.genre ?? "",
    hook: input.hook ?? "",
  });
  const body = attachContext(
    `Write social rollout copy with **hooks + narrative beats**—not single bland lines.

Input: ${payload}

Return JSON:
- section_overview: string — strategy for rollout tone (2 short paragraphs).
- reasoning: string — why these lines fit the act.
- social: string — 8–12 lines (hooks, CTAs, story beats) separated by newlines.
- hashtags: string.
- alt_storytelling: string — BTS / diary-style block, multi-paragraph.
- posting_plan: string[] — 7 items: what to post + suggested day offset (e.g. "Day -5: ...").`,
    ctx
  );
  return [
    { role: "system", content: SYS_CREATIVE_JSON },
    { role: "user", content: body },
  ];
}

function messagesRollout(input: Record<string, unknown>, ctx?: string): ChatMessage[] {
  const payload = JSON.stringify({
    releaseTitle: input.releaseTitle ?? "Release",
    releaseDate: input.releaseDate ?? "",
    platforms: input.platforms ?? "",
    songDescription: input.songDescription ?? "",
    lyrics: input.lyrics ?? "",
    genre: input.genre ?? "",
  });
  const body = attachContext(
    `Build a **release campaign system** (not generic marketing tips). Use songDescription + lyrics for angles when present.

Input: ${payload}

Return JSON:
- section_executive: string — SECTION 1 style overview for the manager/artist (2–3 paragraphs).
- section_opportunities: string — SECTION 2: audiences, playlists, narratives to exploit (2–3 paragraphs).
- reasoning: string — ≥60 words: why this sequencing fits THIS release.
- phases: array of { week: string, focus: string, tasks: string[] } — **at least 5** phases; tasks must be specific ("Email 3 remix DJs" not "promote song").
- platformStrategy: object — keys are platform names (e.g. tiktok, instagram, spotify, youtube); each value is a multi-sentence tactic string for that platform.
- promotionIdeas: string[] — **at least 8** concrete promo ideas (stunts, collabs, ads angles).
- action_checklist: string[] — 10+ ordered steps from now through +2 weeks post-release.
- risks_and_mitigations: array of { risk: string, mitigation: string } — at least 4 entries.`,
    ctx
  );
  return [
    { role: "system", content: SYS_CREATIVE_JSON },
    { role: "user", content: body },
  ];
}

function messagesLyricsBasic(input: Record<string, unknown>, ctx?: string): ChatMessage[] {
  const lyrics = String(input.lyrics ?? "").slice(0, 3000);
  const body = attachContext(
    `Structured lyric critique — multi-paragraph reasoning, no fluff.

Lyrics:
${lyrics}

Return JSON:
- section_overview: string — 2 paragraphs on what the section is doing for listeners.
- reasoning: string — why your scores/feedback follow from the text.
- emotion: { primary, secondary, intensity, description } — description 3–6 sentences.
- rhyme: { density, scheme, quality, feedback } — feedback substantive (no generic praise).
- flow: { rating, patterns, suggestions } — suggestions: string[] with **at least 5** items.
- improvements: [{ line, issue, suggestion }] — **at least 5** entries, each suggestion actionable.
- excerptAnalyzed: string.
- scores: { overall, writing, flow, originality } each 0–10.`,
    ctx
  );
  return [
    { role: "system", content: SYS_CREATIVE_JSON },
    { role: "user", content: body },
  ];
}

function messagesLyricsAdvanced(input: Record<string, unknown>, ctx?: string): ChatMessage[] {
  const lyrics = String(input.lyrics ?? "").slice(0, 4000);
  const body = attachContext(
    `Deep A&R / writer-room analysis: imagery stacks, filler, hook durability, cadence, listener payoff.

Lyrics:
${lyrics}

Return JSON with SAME keys as basic analysis but push harder:
- section_overview: 3 paragraphs.
- reasoning: 2 paragraphs tying weaknesses to opportunities.
- emotion.description: include executive summary of the song arc.
- flow.suggestions: at least 6 specific strings.
- improvements: at least 6 entries; include rewrite directions where useful.
- scores: { overall, writing, flow, originality } each 0–10.`,
    ctx
  );
  return [
    { role: "system", content: SYS_CREATIVE_JSON },
    { role: "user", content: body },
  ];
}

function messagesCover(input: Record<string, unknown>, ctx?: string): ChatMessage[] {
  const payload = JSON.stringify({
    title: input.title ?? "",
    mood: input.mood ?? "",
    style: input.style ?? "",
    colors: input.colors ?? "",
  });
  const body = attachContext(
    `Art-direction pack for cover / single artwork — production-ready.

Input: ${payload}

Return JSON:
- section_overview: string — visual narrative (2–3 paragraphs).
- reasoning: string — why these directions match the title/mood.
- description: string — expands overview with motif language.
- composition: string — framing, focal hierarchy, type placement, negative space.
- colorPalette: array { name, hex, use } — **6–10** entries.
- elements: string[] — **12–20** concrete visual elements.
- references: string[] — **4–8** reference angles (movements, eras—no direct ripoffs).
- concepts: string[] — **exactly 3** multi-sentence concept blurbs.
- aiPrompt: string — one flagship English image prompt.
- design_brief_for_designer: string — bullet-style paragraph a designer can execute.`,
    ctx
  );
  return [
    { role: "system", content: SYS_CREATIVE_JSON },
    { role: "user", content: body },
  ];
}

function messagesCollab(input: Record<string, unknown>, ctx?: string): ChatMessage[] {
  const payload = JSON.stringify({
    genre: input.genre ?? "",
    location: input.location ?? "",
    collaboratorType: input.collaboratorType ?? "",
    mood: input.mood ?? "",
  });
  const body = attachContext(
    `You output **ARTIST FINDER** + **COLLAB FINDER** in one JSON object (premium A&R / partnerships brief).

Input: ${payload}

PART A — artistMatches: fictional or composite artist names ok, but must feel **real-world plausible** (not "@user123").
Each match MUST be an object with:
- artist_name (string)
- genre_match_reason (string, 2–4 sentences, cite sub-genres)
- audience_estimate (string, e.g. "12–40k monthly listeners tier; TikTok 3–8k" — reasoned estimate)
- collab_potential_score (number 1–10)
- why_valuable (string, 2+ sentences)
- outreach_strategy (string, multi-sentence: angle, timing, what to offer)

Provide **at least 5** matches.

PART B — collabIdeas: **between 5 and 10** objects, each with:
- title (string)
- detailed_concept (string, multi-paragraph — song structure, sonic palette, marketing hook)
- why_it_fits (string, ties to USER CONTEXT + input)
- execution_plan (string, numbered steps inside the string)
- message_template (string, ready-to-send DM/email; fill-in placeholders like [YOUR TRACK LINK])

Also include:
- section_overview (string) — SECTION 1: executive summary for the artist.
- reasoning (string) — SECTION 2: why this roster/ideas fit now.
- section_action_plan (string) — SECTION 3: prioritized next 7 days.

Return JSON with keys: section_overview, reasoning, section_action_plan, artistMatches, collabIdeas.`,
    ctx
  );
  return [
    { role: "system", content: SYS_CREATIVE_JSON },
    { role: "user", content: body },
  ];
}

function messagesAssistant(input: Record<string, unknown>, ctx?: string): ChatMessage[] {
  const msg = String(input.message ?? "");
  const body = attachContext(msg, ctx);
  return [
    {
      role: "system",
      content: `${SYS_CREATIVE_JSON}

${ASSISTANT_PLATFORM_POLICY}

Return exactly one JSON object: {"reply":"..."}.
The reply string must read like a **product expert**, not chat: use labeled sections (e.g. "Summary:", "Steps:", "Watch-outs:") inside the string. Default minimum ~200 words for non-trivial questions. Be specific to MORRA tools and credits where relevant.`,
    },
    { role: "user", content: body },
  ];
}
