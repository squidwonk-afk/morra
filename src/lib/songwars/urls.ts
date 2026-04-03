const MAX_URL_LEN = 2048;

export function normalizeTrackUrl(raw: string): string {
  return raw.trim();
}

/** Validates streaming/file URLs for Song Wars submissions. */
export function validateTrackUrl(raw: string): { ok: true; url: string } | { ok: false; error: string } {
  const url = normalizeTrackUrl(raw);
  if (!url) return { ok: false, error: "Track URL is required." };
  if (url.length > MAX_URL_LEN) return { ok: false, error: "URL is too long." };
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, error: "Invalid URL. Use http(s) links (e.g. SoundCloud, Spotify, Drive)." };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "Only http and https URLs are allowed." };
  }
  const host = parsed.hostname.toLowerCase();
  const blocked = ["javascript:", "data:", "file:"];
  if (blocked.some((b) => url.toLowerCase().includes(b))) {
    return { ok: false, error: "URL scheme not allowed." };
  }
  // Light sanity: no bare localhost in production-grade checks (optional strictness)
  if (host === "localhost" || host.endsWith(".local")) {
    return { ok: false, error: "Public URLs only (not localhost)." };
  }
  return { ok: true, url: parsed.toString() };
}
