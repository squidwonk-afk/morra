/**
 * AI layer, OpenRouter via generateAI() or local mocks.
 * All OpenRouter calls are server-only.
 */

import type { ToolKey } from "@/lib/constants/credits";
import type { AIJobType } from "@/lib/ai/config";
import { generateAI } from "@/lib/ai/generate-ai";
import { getAiProvider } from "@/lib/ai/provider";
import {
  mockArtistIdentity,
  mockCollab,
  mockCover,
  mockLyrics,
  mockRollout,
} from "@/lib/mock/generators";

export type { AIJobType } from "@/lib/ai/config";
export { MODELS } from "@/lib/ai/config";
export type { CallAIResult } from "@/lib/ai/openrouter-client";
export { callAI } from "@/lib/ai/openrouter-client";
export { generateAI } from "@/lib/ai/generate-ai";

function toolToJobType(
  tool: ToolKey,
  input: Record<string, unknown>
): AIJobType {
  switch (tool) {
    case "identity":
      return "bio";
    case "rollout":
      return "rollout";
    case "lyrics":
      return input.advanced === true || input.mode === "advanced"
        ? "lyrics_advanced"
        : "lyrics_basic";
    case "cover":
      return "cover";
    case "collab":
      return "collab";
    default:
      return "bio";
  }
}

function runMockTool(tool: ToolKey, input: Record<string, unknown>): Record<string, unknown> {
  switch (tool) {
    case "identity":
      return mockArtistIdentity(input);
    case "rollout":
      return mockRollout(input);
    case "lyrics":
      return mockLyrics(input);
    case "cover":
      return mockCover(input);
    case "collab":
      return mockCollab(input);
    default:
      return {};
  }
}

export async function runToolAi(
  tool: ToolKey,
  input: Record<string, unknown>
): Promise<Record<string, unknown>> {
  if (getAiProvider() !== "openrouter") {
    return runMockTool(tool, input);
  }

  const job = toolToJobType(tool, input);
  return generateAI({ type: job, input });
}

export async function runAssistantChat(userMessage: string): Promise<string> {
  if (getAiProvider() !== "openrouter") {
    const { mockChatReply } = await import("@/lib/mock/generators");
    return mockChatReply(userMessage);
  }

  const out = await generateAI({
    type: "assistant",
    input: { message: userMessage },
  });
  const reply = out.reply ?? out.text;
  return typeof reply === "string" ? reply : JSON.stringify(out);
}
