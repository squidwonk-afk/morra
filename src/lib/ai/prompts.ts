import type { ChatMessage } from "@/lib/ai/openrouter-client";
import type { AIJobType } from "@/lib/ai/config";

const SYS_CREATIVE_JSON = `You are an expert creative AI assistant helping musicians and artists with detailed, high-quality outputs.

Rules:
- Be specific, structured, and useful—prefer multiple paragraphs or detailed bullet-style content inside JSON string fields where appropriate.
- Avoid shallow or generic filler; ground advice in the user’s actual inputs.
- Output ONLY valid JSON exactly as requested—no markdown code fences, no text before or after the JSON object.`;

export function messagesForJob(
  type: AIJobType,
  input: Record<string, unknown>
): ChatMessage[] {
  switch (type) {
    case "bio":
      return messagesBio(input);
    case "captions":
      return messagesCaptions(input);
    case "rollout":
      return messagesRollout(input);
    case "lyrics_basic":
      return messagesLyricsBasic(input);
    case "lyrics_advanced":
      return messagesLyricsAdvanced(input);
    case "cover":
      return messagesCover(input);
    case "collab":
      return messagesCollab(input);
    case "assistant":
      return messagesAssistant(input);
    default:
      return messagesBio(input);
  }
}

function messagesBio(input: Record<string, unknown>): ChatMessage[] {
  const payload = JSON.stringify({
    name: input.name ?? "",
    genre: input.genre ?? "",
    influences: input.influences ?? "",
    mood: input.mood ?? "",
    lyrics: input.lyrics ?? "",
  });
  return [
    { role: "system", content: SYS_CREATIVE_JSON },
    {
      role: "user",
      content: `Create **rich** artist branding copy for this act: multiple paragraphs where it helps, concrete imagery, no cliché “passionate artist” filler.

Input JSON: ${payload}

Return JSON keys (all string values unless noted):
- bio: 2–4 paragraphs for website / streaming profile (vivid, credible, genre-aware).
- epk: one longer paragraph + short bullet list as a single string (press-ready narrative).
- social: 3–5 distinct one-liner hooks for bios (separated by newlines in one string).
- hashtags: relevant tags as one string.
- press: a quote-ready short paragraph + angle for blogs.`,
    },
  ];
}

function messagesCaptions(input: Record<string, unknown>): ChatMessage[] {
  const payload = JSON.stringify({
    name: input.name ?? "",
    genre: input.genre ?? "",
    hook: input.hook ?? "",
  });
  return [
    { role: "system", content: SYS_CREATIVE_JSON },
    {
      role: "user",
      content: `Write **strong** social copy—not one bland line. Input: ${payload}

Return JSON keys:
- social: 4–6 lines (hooks, rollouts, CTAs) separated by newlines in one string.
- hashtags: string.
- alt: optional second block with story / behind-the-scenes angles, multi-line string.`,
    },
  ];
}

function messagesRollout(input: Record<string, unknown>): ChatMessage[] {
  const payload = JSON.stringify({
    releaseTitle: input.releaseTitle ?? "Release",
    releaseDate: input.releaseDate ?? "",
    platforms: input.platforms ?? "",
    songDescription: input.songDescription ?? "",
    lyrics: input.lyrics ?? "",
  });
  return [
    { role: "system", content: SYS_CREATIVE_JSON },
    {
      role: "user",
      content: `Build a **week-by-week release campaign** tailored to this song—not generic music-marketing advice. Use songDescription and lyrics when present for angles, content pillars, and narrative hooks.

Input: ${payload}

Return JSON:
- phases: array of { week: string, focus: string, tasks: string[] } — at least 4 phases; each task specific and doable.
- summary: 2–3 paragraphs tying the narrative, audience, and rollout story together.`,
    },
  ];
}

function messagesLyricsBasic(input: Record<string, unknown>): ChatMessage[] {
  const lyrics = String(input.lyrics ?? "").slice(0, 3000);
  return [
    { role: "system", content: SYS_CREATIVE_JSON },
    {
      role: "user",
      content: `Honest, **structured** lyric critique—multi-paragraph reasoning in the “description” and feedback fields where useful.

Lyrics:
${lyrics}

Return JSON:
- emotion: { primary, secondary, intensity, description } — description 2–4 sentences.
- rhyme: { density, scheme, quality, feedback } — feedback substantive.
- flow: { rating, patterns, suggestions[] } — suggestions[] at least 4 strings.
- improvements: [{ line, issue, suggestion }] max 8 entries; each suggestion actionable.
- excerptAnalyzed: brief note on which section you focused on.
- scores: { overall, writing, flow, originality } each 0–10.`,
    },
  ];
}

function messagesLyricsAdvanced(input: Record<string, unknown>): ChatMessage[] {
  const lyrics = String(input.lyrics ?? "").slice(0, 4000);
  return [
    { role: "system", content: SYS_CREATIVE_JSON },
    {
      role: "user",
      content: `Deep-dive lyric analysis: weak bars, filler, imagery, metaphor stacks, cadence, hook durability, and listener payoff. Offer **rewrite suggestions** where they help.

Lyrics:
${lyrics}

Same JSON schema as basic analysis but push harder: richer description text inside emotion/rhyme/flow objects, improvements max 8, scores, and weave a 2-paragraph executive overview into the emotion.description field at the end.`,
    },
  ];
}

function messagesCover(input: Record<string, unknown>): ChatMessage[] {
  const payload = JSON.stringify({
    title: input.title ?? "",
    mood: input.mood ?? "",
    style: input.style ?? "",
    colors: input.colors ?? "",
  });
  return [
    { role: "system", content: SYS_CREATIVE_JSON },
    {
      role: "user",
      content: `Produce **actionable** cover-art direction: 3 distinct visual concepts, each with mood, layout, and symbolic content—then one flagship AI image prompt.

Input: ${payload}

Return JSON keys:
- description: 2–3 paragraphs on overall visual narrative.
- composition: framing, negative space, focal point, typography placement.
- colorPalette: array { name, hex, use } — 4–8 entries.
- elements: string[] — 8–14 concrete visual elements.
- references: string[] — 3–6 reference angles (eras, films, art movements—not copyrighted names as lift).
- concepts: string[] — exactly 3 multi-sentence concept blurbs.
- aiPrompt: one detailed, production-ready English prompt for an image model.`,
    },
  ];
}

function messagesCollab(input: Record<string, unknown>): ChatMessage[] {
  const payload = JSON.stringify({
    genre: input.genre ?? "",
    location: input.location ?? "",
  });
  return [
    { role: "system", content: SYS_CREATIVE_JSON },
    {
      role: "user",
      content: `Suggest **3–5** plausible collaborator profiles (fictional handles ok) with depth: why the fit works, what to send them, how to stand out.

Input: ${payload}

Return JSON:
- matches: [{ handle, fit, note }] — each "note" 2–4 sentences.
- outreachTemplate: multi-paragraph DM/email template the artist can personalize.`,
    },
  ];
}

function messagesAssistant(input: Record<string, unknown>): ChatMessage[] {
  const msg = String(input.message ?? "");
  return [
    {
      role: "system",
      content: `${SYS_CREATIVE_JSON}

Return exactly one JSON object: {"reply":"..."}.
The "reply" string must be **substantive**: by default at least ~150–400 words for non-trivial questions, with clear sections (you may use newlines and light labels like "Summary:", "Steps:", "Ideas:" inside the string). For very short factual pings, you may go shorter but never reply with a single vague sentence.`,
    },
    { role: "user", content: msg },
  ];
}
