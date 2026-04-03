/** OpenRouter models: stronger defaults for production quality */
export const MODELS = {
  /** Reliable instruct model for retries / lighter tasks */
  cheap: "mistralai/mixtral-8x7b-instruct",
  /** Primary “strong” model — Mistral Large on OpenRouter */
  premium: "mistralai/mistral-large-2407",
} as const;

export const OR_MODEL_PRIMARY = MODELS.premium;
export const OR_MODEL_SECONDARY = MODELS.premium;

/** Hard cap per request (raised for detailed tool outputs) */
export const AI_MAX_TOKENS_PER_REQUEST = 6000;

export const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

/** Longer timeout for large completions */
export const OPENROUTER_TIMEOUT_MS = 55_000;

export const OPENROUTER_TEMPERATURE = 0.7;

/** Token tiers */
export const TOKEN_SHORT = 800;
export const TOKEN_MEDIUM = 1600;
export const TOKEN_LARGE = 3200;
export const TOKEN_XL = 4800;

export type AIJobType =
  | "bio"
  | "captions"
  | "rollout"
  | "lyrics_basic"
  | "lyrics_advanced"
  | "cover"
  | "collab"
  | "assistant";

export type ModelSlot = "mistral" | "mixtral";

export function resolveModelId(slot: ModelSlot): string {
  return slot === "mixtral" ? MODELS.premium : MODELS.premium;
}

/** Most tool jobs use large model + generous tokens; assistant matches user expectations for depth */
export const AI_JOB_ROUTING: Record<
  AIJobType,
  { slot: ModelSlot; maxTokens: number }
> = {
  bio: { slot: "mixtral", maxTokens: TOKEN_LARGE },
  captions: { slot: "mistral", maxTokens: TOKEN_MEDIUM },
  rollout: { slot: "mixtral", maxTokens: TOKEN_XL },
  lyrics_basic: { slot: "mixtral", maxTokens: TOKEN_LARGE },
  lyrics_advanced: { slot: "mixtral", maxTokens: TOKEN_XL },
  cover: { slot: "mixtral", maxTokens: TOKEN_LARGE },
  collab: { slot: "mixtral", maxTokens: TOKEN_XL },
  assistant: { slot: "mixtral", maxTokens: TOKEN_LARGE },
};
