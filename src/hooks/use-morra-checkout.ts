"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import type { CreditPackKey, PlanKey } from "@/lib/pricing";

export function useMorraCheckout() {
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  const startCheckout = useCallback(
    async (opts: { type: "subscription"; plan: PlanKey } | { type: "credits"; pack: CreditPackKey }) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setBusy(true);
      try {
        const body =
          opts.type === "subscription"
            ? { type: "subscription" as const, plan: opts.plan }
            : { type: "credits" as const, credits_pack: opts.pack };
        const r = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });
        const j = (await r.json()) as { error?: string; url?: string };
        if (!r.ok) {
          toast.error(j.error || "Checkout failed");
          return;
        }
        if (j.url) {
          window.location.href = j.url;
          return;
        }
        toast.error("No checkout URL returned");
      } catch {
        toast.error("Network error");
      } finally {
        inFlight.current = false;
        setBusy(false);
      }
    },
    []
  );

  return { startCheckout, busy };
}
