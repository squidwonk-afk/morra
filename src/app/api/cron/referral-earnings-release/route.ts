import type { NextRequest } from "next/server";
import { verifyCronRequest } from "@/lib/cron-auth";
import { logMorraInfo, logMorraWarn } from "@/lib/logging";
import { releaseMaturedReferralAccruals } from "@/lib/referral/revenue-share";
import { jsonError, jsonOk } from "@/lib/http";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function run(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return jsonError("Server is not configured.", 503);
  }
  if (!process.env.CRON_SECRET?.trim()) {
    return jsonError("CRON_SECRET is not configured.", 503);
  }
  if (!verifyCronRequest(req)) {
    logMorraWarn("cron", "referral_earnings_release_unauthorized", {});
    return jsonError("Unauthorized.", 401);
  }

  const supabase = getSupabaseAdmin();
  const released = await releaseMaturedReferralAccruals(supabase);
  logMorraInfo("cron", "referral_earnings_release_ok", { released });
  return jsonOk({ released });
}

/** Vercel Cron invokes GET by default. */
export async function GET(req: NextRequest) {
  return run(req);
}

export async function POST(req: NextRequest) {
  return run(req);
}
