import {
  AI_JOB_ROUTING,
  OPENROUTER_TEMPERATURE,
  type AIJobType,
} from "@/lib/ai/config";
import { parseModelJsonObject } from "@/lib/ai/json-parse";
import { completeWithRetryAndFallback } from "@/lib/ai/openrouter-client";
import { messagesForJob } from "@/lib/ai/prompts";
import { getAiProvider } from "@/lib/ai/provider";

export type { AIJobType };

export type GenerateAIParams = {
  type: AIJobType;
  /** Tool payload or { message } for assistant */
  input: Record<string, unknown>;
};

/**
 * Central OpenRouter entry: routing, token caps, 1 retry + fallback.
 * Returns parsed JSON object. Assistant returns `{ reply: string }`.
 */
export async function generateAI(
  params: GenerateAIParams
): Promise<Record<string, unknown>> {
  if (getAiProvider() !== "openrouter") {
    throw new Error("generateAI requires OpenRouter (set OPENROUTER_API_KEY)");
  }

  const route = AI_JOB_ROUTING[params.type];
  const messages = messagesForJob(params.type, params.input);

  const raw = await completeWithRetryAndFallback({
    slot: route.slot,
    maxTokens: route.maxTokens,
    messages,
    temperature: OPENROUTER_TEMPERATURE,
  });

  return parseModelJsonObject(raw);
}
