import { getSessionUserId } from "@/lib/auth/request-user";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { jsonError, jsonOk } from "@/lib/http";
import {
  MAX_PARTICIPANTS_DEFAULT,
  MAX_SUBMISSIONS_PER_USER,
  PRIZE_CREDITS_FREE,
  PRIZE_CREDITS_PAID,
} from "@/lib/songwars/constants";
import { isSongwarsUnavailableError } from "@/lib/songwars/availability";
import { getEventPublicPayload, SongWarsNoActiveEventError } from "@/lib/songwars/service";

export const runtime = "nodejs";

export async function GET() {
  if (!isSupabaseConfigured()) return jsonError("Server is not configured.", 503);
  const userId = await getSessionUserId();

  try {
    const payload = await getEventPublicPayload(getSupabaseAdmin(), userId);
    return jsonOk({
      available: true,
      ...payload,
      rules: {
        maxParticipants: MAX_PARTICIPANTS_DEFAULT,
        maxSubmissionsPerUser: MAX_SUBMISSIONS_PER_USER,
        prizeCreditsPaid: [...PRIZE_CREDITS_PAID],
        prizeCreditsFree: [...PRIZE_CREDITS_FREE],
      },
    });
  } catch (e) {
    if (isSongwarsUnavailableError(e)) {
      return jsonOk({ available: false, comingSoon: true });
    }
    if (e instanceof SongWarsNoActiveEventError) {
      return jsonOk({
        available: true,
        noActiveEvent: true,
        event: null,
        confirmedCount: 0,
        userState: "none" as const,
        submissions: [] as { id: string; title: string; slot_index: number }[],
        submissionsOpen: false,
        lastEvent: null,
        engagement: {
          standingsTop: [],
          yourPosition: null,
          totalSubmissions: 0,
          tracksEntered: 0,
        },
        rules: {
          maxParticipants: MAX_PARTICIPANTS_DEFAULT,
          maxSubmissionsPerUser: MAX_SUBMISSIONS_PER_USER,
          prizeCreditsPaid: [...PRIZE_CREDITS_PAID],
          prizeCreditsFree: [...PRIZE_CREDITS_FREE],
        },
      });
    }
    const msg = e instanceof Error ? e.message : "Could not load event.";
    return jsonError(msg, 500);
  }
}
