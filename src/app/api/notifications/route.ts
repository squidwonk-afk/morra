import { getSessionUserId } from "@/lib/auth/request-user";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { jsonError, jsonOk } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return jsonError("Server is not configured.", 503);
  }
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Unauthorized.", 401);

  const supabase = getSupabaseAdmin();

  const { data: rows, error } = await supabase
    .from("notifications")
    .select("id,type,title,message,read,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) return jsonError("Could not load notifications.", 500);

  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);

  return jsonOk({
    notifications:
      rows?.map((n) => ({
        id: n.id as string,
        type: n.type as string,
        title: n.title as string,
        message: n.message as string,
        read: Boolean(n.read),
        createdAt: n.created_at as string,
      })) ?? [],
    unreadCount: unreadCount ?? 0,
  });
}

