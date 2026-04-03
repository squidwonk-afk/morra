import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Ensures each Stripe event id is processed at most once. Rolls back the claim if handler throws (Stripe retries).
 */
export async function runWebhookOnce(
  supabase: SupabaseClient,
  stripeEventId: string,
  handler: () => Promise<void>
): Promise<{ ran: boolean }> {
  const { error: insErr } = await supabase
    .from("stripe_webhook_events")
    .insert({ stripe_event_id: stripeEventId });
  if (insErr?.code === "23505") {
    return { ran: false };
  }
  if (insErr) {
    throw insErr;
  }
  try {
    await handler();
  } catch (e) {
    await supabase
      .from("stripe_webhook_events")
      .delete()
      .eq("stripe_event_id", stripeEventId);
    throw e;
  }
  return { ran: true };
}
