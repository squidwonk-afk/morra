/**
 * MORRA production smoke / integration checks (manual).
 *
 * Run with the Next.js app already running and env loaded (e.g. `npm run dev`).
 *
 *   npx tsx scripts/test-system.ts
 *   MORRA_BASE_URL=https://your-app.vercel.app npx tsx scripts/test-system.ts
 *
 * Does not complete Stripe Checkout or real payouts — it only hits public APIs.
 */

import { randomBytes } from "node:crypto";

const BASE = (process.env.MORRA_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const CRON_SECRET = process.env.CRON_SECRET?.trim();

type CookieJar = Record<string, string>;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function applySetCookies(jar: CookieJar, res: Response): void {
  const list =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : [];
  for (const line of list) {
    const pair = line.split(";")[0]?.trim();
    if (!pair) continue;
    const eq = pair.indexOf("=");
    if (eq <= 0) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    if (name) jar[name] = value;
  }
}

function cookieHeader(jar: CookieJar): string | undefined {
  const entries = Object.entries(jar);
  if (entries.length === 0) return undefined;
  return entries.map(([k, v]) => `${k}=${v}`).join("; ");
}

async function fetchJson(
  path: string,
  init: RequestInit & { jar?: CookieJar } = {}
): Promise<{ res: Response; json: unknown; jar: CookieJar }> {
  const jar = init.jar ?? {};
  const headers = new Headers(init.headers);
  const ch = cookieHeader(jar);
  if (ch) headers.set("Cookie", ch);

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  applySetCookies(jar, res);
  let json: unknown = null;
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    try {
      json = await res.json();
    } catch {
      json = null;
    }
  }
  return { res, json, jar };
}

let failures = 0;

function pass(name: string, detail?: string): void {
  console.log(`OK   ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name: string, detail: string): void {
  failures += 1;
  console.error(`FAIL ${name} — ${detail}`);
}

function warn(name: string, detail: string): void {
  console.warn(`WARN ${name} — ${detail}`);
}

function randUser(): string {
  const s = randomBytes(4).toString("hex");
  return `smoke_${s}`;
}

function tinyPngFile(): File {
  // 1x1 transparent PNG
  const b64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2d8xkAAAAASUVORK5CYII=";
  const bytes = Buffer.from(b64, "base64");
  const blob = new Blob([bytes], { type: "image/png" });
  return new File([blob], "avatar.png", { type: "image/png" });
}

async function main(): Promise<void> {
  console.log(`MORRA system smoke (base: ${BASE})\n`);

  // --- Cron (auth + optional success) ---
  {
    const r = await fetchJson("/api/cron/referral-earnings-release", { method: "GET" });
    if (r.res.status === 503) {
      warn(
        "cron unauthorized path",
        "CRON_SECRET missing or Supabase not configured — server returned 503 (expected in minimal env)"
      );
    } else if (r.res.status === 401) {
      pass("cron rejects missing secret", String(r.res.status));
    } else {
      fail("cron missing auth", `expected 401 or 503, got ${r.res.status}`);
    }

    if (CRON_SECRET) {
      const ok = await fetch(`${BASE}/api/cron/referral-earnings-release`, {
        method: "GET",
        headers: { Authorization: `Bearer ${CRON_SECRET}` },
      });
      if (ok.status === 200) {
        pass("cron with CRON_SECRET", "200");
      } else if (ok.status === 503) {
        warn("cron with secret", "503 — CRON_SECRET not set on server or Supabase missing");
      } else {
        fail("cron with secret", `expected 200, got ${ok.status}`);
      }
    } else {
      warn("cron authenticated", "skip — CRON_SECRET not in client env (set to test 200)");
    }
  }

  const pin = "123456";
  const u1 = randUser();
  const u2 = randUser();

  // --- Signup user A ---
  let jarA: CookieJar = {};
  {
    const { res, json, jar } = await fetchJson("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: u1,
        displayName: "Smoke A",
        pin,
      }),
      jar: jarA,
    });
    jarA = jar;
    if (res.status !== 200) {
      fail("signup A", `${res.status} ${JSON.stringify(json)}`);
      console.error("\nAborting remaining tests (no session).\n");
      process.exit(failures > 0 ? 1 : 0);
    }
    const ref = (json as { referralCode?: string })?.referralCode;
    pass("signup A", ref ? `referralCode=${ref}` : "ok");

    // --- Session + dashboard ---
    const me = await fetchJson("/api/me", { jar: jarA });
    if (me.res.status !== 200) fail("GET /api/me", String(me.res.status));
    else pass("GET /api/me", "200");

    const dash = await fetchJson("/api/dashboard", { jar: jarA });
    if (dash.res.status !== 200) {
      fail("GET /api/dashboard", String(dash.res.status));
    } else {
      const r = dash.json as { referrals?: { tier?: number; tierPercentLabel?: string } };
      if (r.referrals && typeof r.referrals.tier === "number") {
        pass("dashboard referrals", `tier=${r.referrals.tier}`);
      } else {
        fail("dashboard referrals shape", JSON.stringify(dash.json));
      }
    }

    // --- Duplicate username ---
    const dup = await fetchJson("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: u1,
        displayName: "Dup",
        pin,
      }),
      jar: {},
    });
    if (dup.res.status === 409) pass("duplicate username blocked", "409");
    else fail("duplicate username", `expected 409, got ${dup.res.status}`);

    // --- Same device second signup ---
    const devDup = await fetchJson("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: randUser(),
        displayName: "Same device",
        pin,
      }),
      jar: { ...jarA },
    });
    if (devDup.res.status === 200) pass("same device second signup", "200");
    else warn("same device second signup", `status ${devDup.res.status}`);
  }

  // --- Referral: user B with A's code (fresh device) ---
  let jarB: CookieJar = {};
  const refCode = (await fetchJson("/api/me", { jar: jarA })).json as {
    user?: { referralCode?: string };
  };
  const code = refCode?.user?.referralCode;
  if (code) {
    const b = await fetchJson("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: u2,
        displayName: "Smoke B",
        pin,
        referralCode: code,
      }),
      jar: jarB,
    });
    jarB = b.jar;
    if (b.res.status === 200) pass("signup B with referral code", "200");
    else fail("signup B referred", `${b.res.status} ${JSON.stringify(b.json)}`);
  } else {
    warn("referral signup", "no referralCode on /api/me");
  }

  // --- Login ---
  {
    const jar = await fetchJson("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: u1, pin: "000000" }),
      jar: {},
    });
    if (jar.res.status === 401) pass("login wrong PIN", "401");
    else fail("login wrong PIN", String(jar.res.status));

    const ok = await fetchJson("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: u1, pin }),
      jar: {},
    });
    if (ok.res.status === 200) pass("login", "200");
    else fail("login", `${ok.res.status} ${JSON.stringify(ok.json)}`);
  }

  // --- Tool generation (mock OK when no OpenRouter) ---
  {
    // Credits before
    const meBefore = await fetchJson("/api/me", { jar: jarA });
    const beforeCredits = Number(
      ((meBefore.json as { credits?: { balance?: number } })?.credits?.balance ?? 0) as number
    );

    const id = await fetchJson("/api/tools/identity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test", genre: "indie" }),
      jar: jarA,
    });
    if (id.res.status === 200) pass("POST /api/tools/identity", "200");
    else fail("tools/identity", `${id.res.status} ${JSON.stringify(id.json)}`);

    // Credits after (deduct only on success)
    const meAfter = await fetchJson("/api/me", { jar: jarA });
    const afterCredits = Number(
      ((meAfter.json as { credits?: { balance?: number } })?.credits?.balance ?? 0) as number
    );
    if (afterCredits < beforeCredits) pass("credits deducted after tool success", `${beforeCredits}→${afterCredits}`);
    else fail("credits deducted", `expected decrease, got ${beforeCredits}→${afterCredits}`);

    // Drive credits to 0 then verify INSUFFICIENT_CREDITS
    await sleep(3100);
    const c1 = await fetchJson("/api/tools/cover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Smoke", vibes: "neon" }),
      jar: jarA,
    });
    if (c1.res.status === 200) pass("POST /api/tools/cover #1", "200");
    else warn("tools/cover #1", `${c1.res.status} ${JSON.stringify(c1.json)}`);

    await sleep(3100);
    const c2 = await fetchJson("/api/tools/cover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Smoke", vibes: "neon" }),
      jar: jarA,
    });
    if (c2.res.status === 200) pass("POST /api/tools/cover #2", "200");
    else warn("tools/cover #2", `${c2.res.status} ${JSON.stringify(c2.json)}`);

    await sleep(3100);
    const insuff = await fetchJson("/api/tools/identity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "X", genre: "Y" }),
      jar: jarA,
    });
    if (insuff.res.status === 402 && (insuff.json as { error?: string })?.error === "INSUFFICIENT_CREDITS") {
      pass("INSUFFICIENT_CREDITS contract", "402 + error code");
    } else {
      warn("INSUFFICIENT_CREDITS contract", `${insuff.res.status} ${JSON.stringify(insuff.json)}`);
    }

    const spacing = await fetchJson("/api/tools/rollout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ releaseTitle: "Smoke EP" }),
      jar: jarA,
    });
    // 3s spacing from identity — may 429
    if (spacing.res.status === 200) pass("POST /api/tools/rollout", "200");
    else if (spacing.res.status === 429) warn("tools/rollout", "429 spacing (re-run or wait 3s)");
    else fail("tools/rollout", `${spacing.res.status}`);
  }

  // --- AI generate route (requires OpenRouter on server) ---
  {
    const ai = await fetchJson("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "bio",
        data: { name: "X", genre: "y" },
      }),
      jar: jarA,
    });
    if (ai.res.status === 503) {
      warn("/api/ai/generate", "503 mock mode — set OPENROUTER_API_KEY on server for live AI");
    } else if (ai.res.status === 200) {
      pass("/api/ai/generate", "200");
    } else if (ai.res.status === 429) {
      warn("/api/ai/generate", "429 — rate/spacing");
    } else {
      fail("/api/ai/generate", `${ai.res.status} ${JSON.stringify(ai.json)}`);
    }
  }

  // --- Chat ---
  {
    const chat = await fetchJson("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "ping" }),
      jar: jarA,
    });
    if (chat.res.status === 200) pass("POST /api/chat", "200");
    else if (chat.res.status === 429) warn("/api/chat", "429 spacing");
    else if (chat.res.status === 503) warn("/api/chat", "503 — OpenRouter not configured");
    else fail("/api/chat", `${chat.res.status}`);
  }

  // --- Stripe checkout (needs real Stripe + price IDs) ---
  {
    const sub = await fetchJson("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "subscription", plan: "starter" }),
      jar: jarA,
    });
    if (sub.res.status === 200 && (sub.json as { url?: string })?.url) {
      pass("checkout subscription", "url returned");
    } else if (sub.res.status === 502 || sub.res.status === 500) {
      warn("checkout subscription", `${sub.res.status} — Stripe keys or price IDs not configured`);
    } else {
      fail("checkout subscription", `${sub.res.status} ${JSON.stringify(sub.json)}`);
    }

    const pack = await fetchJson("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "credits", pack: "small" }),
      jar: jarA,
    });
    if (pack.res.status === 200 && (pack.json as { url?: string })?.url) {
      pass("checkout credit pack", "url returned");
    } else if (pack.res.status === 502 || pack.res.status === 500) {
      warn("checkout pack", `${pack.res.status} — Stripe not configured`);
    } else {
      fail("checkout pack", `${pack.res.status}`);
    }
  }

  // --- Payout (no Connect account expected) ---
  {
    const po = await fetchJson("/api/stripe/payout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
      jar: jarA,
    });
    if (po.res.status === 400) {
      const j = po.json as { error?: string };
      if (String(j?.error ?? "").toLowerCase().includes("connect")) {
        pass("payout without Connect", "400 as expected");
      } else pass("payout without Connect", String(po.res.status));
    } else {
      warn("payout", `status ${po.res.status} (expected 400 without Stripe Connect)`);
    }
  }

  // --- Avatar upload + persistence ---
  {
    const jar = jarA;
    const file = tinyPngFile();
    const form = new FormData();
    form.set("file", file);
    const r = await fetch(`${BASE}/api/users/avatar`, {
      method: "POST",
      headers: { Cookie: cookieHeader(jar) ?? "" },
      body: form,
    });
    const j = (await r.json().catch(() => null)) as { success?: boolean; avatarUrl?: string; error?: string } | null;
    if (r.status === 200 && j?.avatarUrl) {
      pass("avatar upload", "200");
      const me = await fetchJson("/api/me", { jar });
      const url = (me.json as { user?: { avatar_url?: string | null } })?.user?.avatar_url ?? null;
      if (typeof url === "string" && url.length > 0) pass("avatar persisted in /api/me", "ok");
      else fail("avatar persisted in /api/me", JSON.stringify(me.json));
    } else {
      warn("avatar upload", `${r.status} ${JSON.stringify(j)}`);
    }
  }

  // --- Notifications fetch ---
  {
    const n = await fetchJson("/api/notifications", { jar: jarA });
    if (n.res.status === 200) pass("GET /api/notifications", "200");
    else warn("GET /api/notifications", `${n.res.status} ${JSON.stringify(n.json)}`);
  }

  console.log(failures === 0 ? "\nDone — all required checks passed." : `\nDone — ${failures} failure(s).`);
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
