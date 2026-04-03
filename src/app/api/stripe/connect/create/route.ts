import { getSessionUserId } from "@/lib/auth/request-user";
import { jsonError } from "@/lib/http";
import { getStripe, isStripeSecretConfigured } from "@/lib/stripe";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function siteBaseUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}

function connectAccountIdFromRow(row: {
  stripe_account_id?: string | null;
  stripe_connect_account_id?: string | null;
}): string | null {
  const a = row.stripe_account_id?.trim();
  if (a) return a;
  const b = row.stripe_connect_account_id?.trim();
  return b || null;
}

/**
 * Returns a Stripe Connect Express onboarding URL. Creates at most one Connect account per profile
 * (conditional update when both id columns are still null).
 */
export async function POST() {
  if (!isSupabaseConfigured()) {
    return jsonError("Server is not configured.", 503);
  }
  if (!isStripeSecretConfigured()) {
    return jsonError("Billing is not configured.", 503);
  }

  const userId = await getSessionUserId();
  if (!userId) {
    return jsonError("Unauthorized.", 401);
  }

  const base = siteBaseUrl();
  if (!base) {
    return jsonError("Server misconfigured: NEXT_PUBLIC_SITE_URL.", 500);
  }

  const supabase = getSupabaseAdmin();
  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("stripe_account_id, stripe_connect_account_id, flagged")
    .eq("id", userId)
    .single();

  if (pErr || !profile) {
    return jsonError("User not found.", 404);
  }
  if (profile.flagged) {
    return jsonError("Action temporarily limited. Please try again later.", 403);
  }

  let accountId = connectAccountIdFromRow(profile);

  const stripe = getStripe();

  if (!accountId) {
    try {
      const account = await stripe.accounts.create({
        type: "express",
        metadata: { morra_user_id: userId },
        capabilities: {
          transfers: { requested: true },
        },
      });

      const { data: linked } = await supabase
        .from("profiles")
        .update({
          stripe_account_id: account.id,
          stripe_connect_account_id: account.id,
        })
        .eq("id", userId)
        .is("stripe_account_id", null)
        .is("stripe_connect_account_id", null)
        .select("stripe_account_id, stripe_connect_account_id")
        .maybeSingle();

      if (linked) {
        accountId = connectAccountIdFromRow(linked);
      } else {
        const { data: again } = await supabase
          .from("profiles")
          .select("stripe_account_id, stripe_connect_account_id")
          .eq("id", userId)
          .single();
        accountId = again ? connectAccountIdFromRow(again) : null;
        if (!accountId) {
          return jsonError(
            "Could not link Stripe account. Please try again in a moment.",
            409
          );
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Stripe Connect error";
      return jsonError(msg, 502);
    }
  }

  if (!accountId) {
    return jsonError("Could not resolve Connect account.", 500);
  }

  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${base}/dashboard`,
      return_url: `${base}/dashboard`,
      type: "account_onboarding",
    });

    if (!accountLink.url) {
      return jsonError("Could not create onboarding link.", 500);
    }

    return Response.json({ url: accountLink.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Stripe onboarding error";
    return jsonError(msg, 502);
  }
}
