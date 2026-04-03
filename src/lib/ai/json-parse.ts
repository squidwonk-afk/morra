/**
 * Extract JSON from model output (plain JSON or ```json ... ``` fences).
 */
export function parseModelJsonObject(text: string): Record<string, unknown> {
  let t = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/im.exec(t);
  if (fence) t = fence[1].trim();
  const i = t.indexOf("{");
  const j = t.lastIndexOf("}");
  if (i === -1 || j === -1 || j <= i) {
    throw new Error("AI response: no JSON object found");
  }
  t = t.slice(i, j + 1);
  const parsed = JSON.parse(t) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("AI response: root must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}
