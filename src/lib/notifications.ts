import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type NotificationType = "subscription" | "referral" | "system" | "usage";

export async function createNotification(
  supabase: SupabaseClient,
  userId: string,
  type: NotificationType,
  title: string,
  message: string
): Promise<void> {
  const t = title.trim();
  const m = message.trim();
  if (!userId || !t || !m) return;
  await supabase.from("notifications").insert({
    user_id: userId,
    type,
    title: t.slice(0, 120),
    message: m.slice(0, 600),
    read: false,
  });
}

// Server-side convenience wrapper (API routes/services) matching the app contract.
export async function createNotificationForUser(
  userId: string,
  type: NotificationType,
  title: string,
  message: string
): Promise<void> {
  return createNotification(getSupabaseAdmin(), userId, type, title, message);
}

