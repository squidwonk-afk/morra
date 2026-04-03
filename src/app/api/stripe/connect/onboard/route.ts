import { NextRequest } from "next/server";
import { getSessionUserId } from "@/lib/auth/request-user";
import { jsonError, jsonOk } from "@/lib/http";
import { appBaseUrlFromRequest } from "@/lib/stripe/app-base-url";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return jsonError("Server is not configured.", 503);
  }
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonError("Unauthorized.", 401);
  }

  const supabase = getSupabaseAdmin();
  const { data: user, error: uErr } = await supabase
    .from("profiles")
    .select("stripe_account_id, stripe_connect_account_id, flagged")
    .eq("id", userId)
    .single();
  if (uErr || !user) {
    return jsonError("User not found.", 404);
  }
  if (user.flagged) {
    return jsonError("Action temporarily limited. Please try again later.", 403);
  }

  const accountId =
    (user.stripe_account_id as string | null | undefined)?.trim() ||
    (user.stripe_connect_account_id as string | null | undefined)?.trim() ||
    null;
  if (!accountId?.trim()) {
    return jsonError("Create a Connect account first.", 400);
  }

  const base = appBaseUrlFromRequest(req);
  const settingsUrl = `${base}/app/settings?tab=earnings`;

  const stripe = getStripe();
  try {
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: settingsUrl,
      return_url: settingsUrl,
      type: "account_onboarding",
    });

    if (!link.url) {
      return jsonError("Could not create onboarding link.", 500);
    }

    return jsonOk({ url: link.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Stripe onboarding error";
    return jsonError(msg, 502);
  }
}
