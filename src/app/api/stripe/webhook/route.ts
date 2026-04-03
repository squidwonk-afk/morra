import { NextResponse } from "next/server";
import { getStripe, requireWebhookSecret } from "@/lib/stripe";
import { processStripeWebhookEvent } from "@/lib/stripe/process-webhook";
import { logMorraError } from "@/lib/logging";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Server is not configured." }, { status: 503 });
  }

  const rawBody = await request.text();
  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let secret: string;
  try {
    secret = requireWebhookSecret();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Missing STRIPE_WEBHOOK_SECRET";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const stripe = getStripe();
  let event: import("stripe").Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid signature";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  try {
    await processStripeWebhookEvent(event, supabase);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    logMorraError("stripe_webhook", "handler_failed", {
      eventType: event.type,
      eventId: event.id,
      detail,
    });
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Webhook error" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
