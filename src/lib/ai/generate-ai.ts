import {
  AI_JOB_ROUTING,
  OPENROUTER_TEMPERATURE,
  type AIJobType,
} from "@/lib/ai/config";
import { parseModelJsonObject } from "@/lib/ai/json-parse";
import { completeWithRetryAndFallback } from "@/lib/ai/openrouter-client";
import { messagesForJob } from "@/lib/ai/prompts";
import { validateToolOutput } from "@/lib/ai/quality-gate";
import { getAiProvider } from "@/lib/ai/provider";

export type { AIJobType };

export type GenerateAIParams = {
  type: AIJobType;
  input: Record<string, unknown>;
  /** Built by buildUserContextPrompt — injected into user messages */
  userContextBlock?: string;
};

export type GenerateAIResult = {
  result: Record<string, unknown>;
  attempts: number;
};

const MAX_QUALITY_ATTEMPTS = 3;
const REPAIR_SNIP_LEN = 12_000;

/**
 * OpenRouter entry: routing, token caps, transport retry, then **quality loop**
 * (regenerate if JSON invalid or shallow/generic).
 */
export async function generateAI(params: GenerateAIParams): Promise<GenerateAIResult> {
  if (getAiProvider() !== "openrouter") {
    throw new Error("generateAI requires OpenRouter (set OPENROUTER_API_KEY)");
  }

  const route = AI_JOB_ROUTING[params.type];
  let messages = messagesForJob(params.type, params.input, params.userContextBlock);
  let lastFailure = "AI output failed quality checks.";

  for (let attempt = 1; attempt <= MAX_QUALITY_ATTEMPTS; attempt++) {
    const raw = await completeWithRetryAndFallback({
      slot: route.slot,
      maxTokens: route.maxTokens,
      messages,
      temperature: OPENROUTER_TEMPERATURE,
    });

    let parsed: Record<string, unknown>;
    try {
      parsed = parseModelJsonObject(raw);
    } catch (e) {
      lastFailure = e instanceof Error ? e.message : "Invalid JSON";
      const snip = raw.length > REPAIR_SNIP_LEN ? raw.slice(0, REPAIR_SNIP_LEN) + "…" : raw;
      messages = [
        ...messages,
        { role: "assistant" as const, content: snip },
        {
          role: "user" as const,
          content: `That response was not valid JSON: ${lastFailure}. Output ONE corrected JSON object only. No markdown.`,
        },
      ];
      continue;
    }

    const q = validateToolOutput(params.type, parsed);
    if (q.ok) {
      return { result: parsed, attempts: attempt };
    }

    lastFailure = q.reason;
    const snip = raw.length > REPAIR_SNIP_LEN ? raw.slice(0, REPAIR_SNIP_LEN) + "…" : raw;
    messages = [
      ...messages,
      { role: "assistant" as const, content: snip },
      {
        role: "user" as const,
        content: `REGENERATE the full JSON from scratch. Issue: ${q.reason}. Satisfy every required field and depth rule. Output ONLY valid JSON.`,
      },
    ];
  }

  throw new Error(lastFailure);
}
