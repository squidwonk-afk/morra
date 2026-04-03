function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "object" && e !== null && "message" in e) {
    return String((e as { message: unknown }).message ?? "");
  }
  return String(e ?? "");
}

/**
 * Detect missing Song Wars schema/tables (migrations not applied) or other
 * infra gaps so APIs can return a soft "coming soon" instead of 500s.
 */
export function isSongwarsUnavailableError(e: unknown): boolean {
  const raw = errorMessage(e);
  const m = raw.toLowerCase();
  if (!m) return false;
  if (/42p01|undefined_table/.test(m)) return true;
  if (/relation ['"][^'"]*songwars[^'"]*['"] does not exist/.test(m)) return true;
  if (/relation .* does not exist/.test(m) && /songwars/.test(m)) return true;
  if (/could not find the table|schema cache|pgrst205|pgrst/i.test(m)) return true;
  if (/permission denied for table/.test(m) && /songwars/.test(m)) return true;
  return false;
}
