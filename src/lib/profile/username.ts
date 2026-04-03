/** Safe @handle for UI (never empty whitespace). */
export function displayUsername(raw: unknown): string {
  const s = typeof raw === "string" ? raw.trim() : "";
  return s.length > 0 ? s : "user";
}
