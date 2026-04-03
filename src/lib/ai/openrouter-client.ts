import {
  AI_MAX_TOKENS_PER_REQUEST,
  MODELS,
  OPENROUTER_API_URL,
  OPENROUTER_TEMPERATURE,
  OPENROUTER_TIMEOUT_MS,
  resolveModelId,
  type ModelSlot,
} from "@/lib/ai/config";
import { logMorraError } from "@/lib/logging";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type CallAIResult =
  | { ok: true; content: string }
  | { ok: false; error: string };

const BILLING_UNAVAILABLE =
  "AI service temporarily unavailable. Please try again later.";
const FAILSOFT = "AI temporarily unavailable";

function isBillingError(status: number, body: string): boolean {
  if (status === 402 || status === 429) return true;
  const s = body.toLowerCase();
  return (
    s.includes("insufficient") ||
    s.includes("billing") ||
    s.includes("quota") ||
    s.includes("payment") ||
    s.includes("balance") ||
    s.includes("credit") ||
    s.includes("exceeded your") ||
    s.includes("rate limit")
  );
}

function errorMessageForResponse(status: number, body: string): string {
  if (isBillingError(status, body)) return BILLING_UNAVAILABLE;
  return FAILSOFT;
}

/**
 * Single OpenRouter completion with timeout. Does not throw.
 */
async function fetchChatCompletion(params: {
  model: string;
  messages: ChatMessage[];
  maxTokens: number;
  temperature?: number;
}): Promise<CallAIResult> {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) {
    return { ok: false, error: "Missing OPENROUTER_API_KEY" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPENROUTER_TIMEOUT_MS);
  try {
    const res = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": openRouterReferer(),
        "X-Title": "MORRA",
      },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        max_tokens: params.maxTokens,
        temperature: params.temperature ?? OPENROUTER_TEMPERATURE,
      }),
      signal: controller.signal,
    });
    const raw = await res.text();
    if (!res.ok) {
      return {
        ok: false,
        error: errorMessageForResponse(res.status, raw),
      };
    }
    let data: { choices?: { message?: { content?: string | null } }[] };
    try {
      data = JSON.parse(raw) as typeof data;
    } catch {
      return { ok: false, error: FAILSOFT };
    }
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) return { ok: false, error: FAILSOFT };
    return { ok: true, content: text };
  } catch (e) {
    const aborted =
      e instanceof Error && (e.name === "AbortError" || e.message === "canceled");
    if (aborted) return { ok: false, error: FAILSOFT };
    return { ok: false, error: FAILSOFT };
  } finally {
    clearTimeout(timer);
  }
}

/** Prefer NEXT_PUBLIC_APP_URL (production domain), then explicit referer, then morra.store */
export function openRouterReferer(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.OPENROUTER_HTTP_REFERER?.trim() ||
    "https://morra.store"
  );
}

/**
 * Safe OpenRouter call: capped tokens, 10s timeout, never throws.
 * Failsafe: one retry on the cheap model only if the first attempt used a different model;
 * if the first model was already cheap, a single retry is still one extra attempt with cheap (max 2 HTTP calls total).
 */
export async function callAI(params: {
  model: string;
  messages: ChatMessage[];
  max_tokens: number;
  temperature?: number;
}): Promise<CallAIResult> {
  const maxTokens = Math.min(
    Math.max(1, Math.floor(params.max_tokens)),
    AI_MAX_TOKENS_PER_REQUEST
  );
  const temperature = params.temperature ?? OPENROUTER_TEMPERATURE;

  const first = await fetchChatCompletion({
    model: params.model,
    messages: params.messages,
    maxTokens,
    temperature,
  });
  if (first.ok) return first;

  const second = await fetchChatCompletion({
    model: MODELS.cheap,
    messages: params.messages,
    maxTokens,
    temperature,
  });
  if (second.ok) return second;

  if (!first.ok && first.error === "Missing OPENROUTER_API_KEY") {
    return first;
  }
  if (!second.ok && second.error === "Missing OPENROUTER_API_KEY") {
    return second;
  }

  return { ok: false, error: FAILSOFT };
}

/**
 * Routed job: primary model from slot, then failsafe inside callAI (cheap retry).
 */
export async function completeWithRetryAndFallback(params: {
  slot: ModelSlot;
  maxTokens: number;
  messages: ChatMessage[];
  temperature?: number;
}): Promise<string> {
  const primaryId = resolveModelId(params.slot);
  const capped = Math.min(params.maxTokens, AI_MAX_TOKENS_PER_REQUEST);
  const result = await callAI({
    model: primaryId,
    messages: params.messages,
    max_tokens: capped,
    temperature: params.temperature,
  });
  if (!result.ok) throw new Error(result.error);
  return result.content;
}
