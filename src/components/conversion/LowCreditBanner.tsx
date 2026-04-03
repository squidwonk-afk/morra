"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useMorraUser } from "@/contexts/MorraUserContext";
import { LOW_CREDIT_THRESHOLD } from "@/lib/conversion/constants";
import { AlertTriangle } from "lucide-react";

async function logLowCreditShown(): Promise<void> {
  try {
    await fetch("/api/conversion/log", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entries: [
          { type: "funnel", event_type: "low_credit_warning_shown", metadata: {} },
          { type: "upgrade_trigger", trigger_type: "credits_below_threshold", metadata: { source: "banner" } },
        ],
      }),
    });
  } catch {
    /* non-blocking */
  }
}

async function logClickedBuyCredits(): Promise<void> {
  try {
    await fetch("/api/conversion/log", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entries: [{ type: "funnel", event_type: "clicked_buy_credits", metadata: { source: "low_credit_banner" } }],
      }),
    });
  } catch {
    /* non-blocking */
  }
}

export function LowCreditBanner() {
  const { me } = useMorraUser();
  const loggedRef = useRef(false);

  const balance = me?.credits?.balance ?? 0;
  const isGod = me?.user?.isGod;
  const userId = me?.user?.id;

  useEffect(() => {
    if (!userId || isGod || balance >= LOW_CREDIT_THRESHOLD) {
      loggedRef.current = false;
      return;
    }
    if (loggedRef.current) return;
    const day = new Date().toISOString().slice(0, 10);
    const key = `morra_lowcredit_banner_${day}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
    loggedRef.current = true;
    void logLowCreditShown();
  }, [userId, isGod, balance]);

  if (!userId || isGod || balance >= LOW_CREDIT_THRESHOLD) return null;

  return (
    <div className="mb-6 rounded-xl border border-[#E0B040]/35 bg-[#E0B040]/8 px-4 py-3 flex flex-wrap items-center gap-3 justify-between animate-in fade-in duration-300">
      <div className="flex items-center gap-2 text-sm text-[#E8E0C8]">
        <AlertTriangle className="text-[#E0B040] shrink-0" size={18} aria-hidden />
        <span>
          Low balance: <strong className="tabular-nums text-[#00FF94]">{balance}</strong> credits remain.
        </span>
      </div>
      <Link
        href="/app/pricing"
        className="text-sm font-medium text-[#00FF94] hover:underline whitespace-nowrap"
        onClick={() => void logClickedBuyCredits()}
      >
        Add credits
      </Link>
    </div>
  );
}
