"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { FIRST_SESSION_KEY } from "@/components/FirstTimeGiftModal";

export type MeResponse = {
  ok?: boolean;
  /** Minimum referral withdrawal in cents (USD $5 default). */
  minPayoutCents?: number;
  /** ISO time when the earliest unreleased accrual may move from pending to available (10-day hold from created_at). */
  nextPendingReleaseAt?: string | null;
  /** True when a payout is in flight (`payout_logs.status = pending`). */
  payoutInProgress?: boolean;
  /** Display/settlement currency for referral payouts. */
  currency?: string;
  user?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
    avatarUpdatedAt?: string | null;
    referralCode: string;
    plan: string;
    createdAt?: string;
    giftClaimed?: boolean;
    isGod?: boolean;
    subscriptionStatus?: string | null;
    subscriptionPlan?: string | null;
    subscriptionCurrentPeriodEnd?: string | null;
    lastCreditRefresh?: string | null;
    stripeConnectAccountId?: string | null;
    flagged?: boolean;
  };
  credits?: { balance: number };
  xp?: { xp: number; level: number; streak: number };
  earnings?: { availableCents: number; pendingCents: number };
};

type Ctx = {
  me: MeResponse | null;
  refresh: () => Promise<void>;
};

const MorraUserContext = createContext<Ctx | null>(null);

export function MorraUserProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<MeResponse | null>(null);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/me", { credentials: "include", cache: "no-store" });
      const j = (await r.json()) as MeResponse;
      if (r.ok && j.user) {
        if (typeof window !== "undefined" && !localStorage.getItem(FIRST_SESSION_KEY)) {
          localStorage.setItem(FIRST_SESSION_KEY, new Date().toISOString().slice(0, 10));
        }
        setMe(j);
      } else {
        setMe(null);
      }
    } catch {
      setMe(null);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    function onVis() {
      if (document.visibilityState === "visible") void refresh();
    }
    window.addEventListener("focus", onVis);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", onVis);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refresh]);

  const value: Ctx = { me, refresh };
  return <MorraUserContext.Provider value={value}>{children}</MorraUserContext.Provider>;
}

export function useMorraUser(): Ctx {
  const ctx = useContext(MorraUserContext);
  if (!ctx) {
    return { me: null, refresh: async () => {} };
  }
  return ctx;
}
