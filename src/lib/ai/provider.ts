export type AIProvider = "mock" | "openrouter";

export function getAiProvider(): AIProvider {
  if (process.env.AI_PROVIDER === "mock") return "mock";
  if (process.env.OPENROUTER_API_KEY?.trim()) return "openrouter";
  return "mock";
}
