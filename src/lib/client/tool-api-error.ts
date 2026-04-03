export type ToolBlockReason = "free_tier_limit" | "insufficient_credits";

export function toolBlockReasonFromResponse(
  status: number,
  body: unknown
): ToolBlockReason | null {
  if (status !== 402) return null;
  const r = (body as { reason?: string })?.reason;
  return r === "free_tier_limit" ? "free_tier_limit" : "insufficient_credits";
}
