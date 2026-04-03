/** In-memory duplicate guard (same user + payload within window). Serverless: best-effort per instance. */

const WINDOW_MS = 2500;
const store = new Map<string, number>();

function prune(now: number) {
  for (const [k, t] of store) {
    if (now - t > WINDOW_MS * 3) store.delete(k);
  }
}

/**
 * @returns true if this is a duplicate (reject request)
 */
export function isDuplicateAiRequest(key: string): boolean {
  const now = Date.now();
  prune(now);
  const last = store.get(key);
  if (last !== undefined && now - last < WINDOW_MS) {
    return true;
  }
  store.set(key, now);
  return false;
}
