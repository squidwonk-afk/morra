"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useMorraUser } from "@/contexts/MorraUserContext";

type MePayload = {
  user?: {
    id?: string;
    username?: string;
    displayName?: string;
    plan?: string;
    subscriptionPlan?: string | null;
  };
  credits?: { balance?: number };
  xp?: { xp?: number; level?: number; streak?: number };
};

function SuccessContent() {
  const searchParams = useSearchParams();
  const { refresh } = useMorraUser();
  const sessionId = searchParams.get("session_id")?.trim() ?? "";

  const [phase, setPhase] = useState<"loading" | "synced" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [meSnapshot, setMeSnapshot] = useState<MePayload | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function pullMe() {
      const m = await fetch("/api/me", { credentials: "include", cache: "no-store" });
      const j = (await m.json()) as MePayload & { ok?: boolean };
      if (m.ok && j.user?.id) {
        setMeSnapshot({ user: j.user, credits: j.credits, xp: j.xp });
        return true;
      }
      return false;
    }

    async function run() {
      if (!sessionId || !sessionId.startsWith("cs_")) {
        setPhase("error");
        setMessage("Missing or invalid checkout session. Use Settings if you completed a purchase.");
        return;
      }

      const r = await fetch(
        `/api/stripe/session?session_id=${encodeURIComponent(sessionId)}`,
        { credentials: "include", cache: "no-store" }
      );
      const verify = (await r.json()) as {
        ok?: boolean;
        error?: string;
        session?: { payment_status?: string };
      };

      if (cancelled) return;
      if (!r.ok || !verify.ok) {
        setPhase("error");
        setMessage(verify.error ?? "Could not confirm checkout session.");
        return;
      }

      const pay = verify.session?.payment_status;
      if (pay && pay !== "paid" && pay !== "no_payment_required") {
        setPhase("error");
        setMessage("Payment is not complete yet. Refresh this page in a moment.");
        return;
      }

      await pullMe();
      if (cancelled) return;
      await refresh();

      await new Promise((res) => setTimeout(res, 2000));
      if (cancelled) return;
      await pullMe();
      await refresh();

      setPhase("synced");
      setMessage(null);
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <h1 className="text-3xl font-bold text-white mb-3">Payment successful</h1>
      {phase === "loading" ? (
        <p className="text-[#A0A0A0]">Confirming checkout and syncing profile, credits, and XP…</p>
      ) : phase === "error" ? (
        <p className="text-red-400 mb-6">{message}</p>
      ) : (
        <>
          <p className="text-[#A0A0A0] mb-4">
            You&apos;re synced. Credits:{" "}
            <span className="text-[#00FF94] font-semibold tabular-nums">
              {meSnapshot?.credits?.balance ?? "—"}
            </span>
            {" · "}
            XP:{" "}
            <span className="text-[#00FF94] font-semibold tabular-nums">
              {meSnapshot?.xp?.xp ?? "—"}
            </span>
            {" · "}
            Level {meSnapshot?.xp?.level ?? "—"}
            {" · "}
            Plan{" "}
            <span className="text-[#00FF94] font-semibold">
              {meSnapshot?.user?.subscriptionPlan ?? meSnapshot?.user?.plan ?? "free"}
            </span>
          </p>
          <p className="text-sm text-[#737373] mb-8">
            If a number still looks off, open the dashboard once more, webhooks can take a few seconds.
          </p>
        </>
      )}
      <Button asChild className="bg-[#00FF94] text-black hover:bg-[#00FF94]/90">
        <Link href="/app">Back to dashboard</Link>
      </Button>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-lg mx-auto px-4 py-16 text-center text-[#A0A0A0]">
          Loading…
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
