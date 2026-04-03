"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  CreditCard,
  Clock,
  TrendingUp,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useMorraUser } from "@/contexts/MorraUserContext";
import { toast } from "sonner";
import Link from "next/link";

type PayoutRow = {
  id: string;
  amountCents: number;
  stripeTransferId: string;
  createdAt: string;
};

function formatUsd(cents: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

const MIN_PAYOUT_CENTS = 1000;

export function Payouts() {
  const { me, refresh } = useMorraUser();
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<PayoutRow[]>([]);

  const availableCents = me?.earnings?.availableCents ?? 0;
  const pendingCents = me?.earnings?.pendingCents ?? 0;
  const lifetimeCents = availableCents + pendingCents;
  const stripeConnected = Boolean(me?.user?.stripeConnectAccountId);
  const flagged = me?.user?.flagged ?? false;

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/stripe/payout-history", { credentials: "include" });
        const j = (await r.json()) as { payouts?: PayoutRow[] };
        if (r.ok && j.payouts) setHistory(j.payouts);
      } catch {
        /* ignore */
      }
    })();
  }, [me?.earnings?.availableCents]);

  async function connectStripe() {
    setBusy(true);
    try {
      const r1 = await fetch("/api/stripe/connect/create-account", {
        method: "POST",
        credentials: "include",
      });
      const j1 = (await r1.json()) as { error?: string };
      if (!r1.ok) {
        toast.error(j1.error || "Could not create Connect account");
        return;
      }
      const r2 = await fetch("/api/stripe/connect/onboard", {
        method: "POST",
        credentials: "include",
      });
      const j2 = (await r2.json()) as { url?: string; error?: string };
      if (!r2.ok) {
        toast.error(j2.error || "Could not start onboarding");
        return;
      }
      if (j2.url) window.location.href = j2.url;
    } finally {
      setBusy(false);
    }
  }

  async function withdraw() {
    setBusy(true);
    try {
      const r = await fetch("/api/stripe/payout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) {
        toast.error(j.error || "Withdrawal failed");
        return;
      }
      toast.success("Funds sent to your connected account.");
      await refresh();
      const h = await fetch("/api/stripe/payout-history", { credentials: "include" });
      const hj = (await h.json()) as { payouts?: PayoutRow[] };
      if (h.ok && hj.payouts) setHistory(hj.payouts);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-3">
          <span className="text-[#00FF94]">Payouts</span>
        </h1>
        <p className="text-xl text-[#A0A0A0]">
          Referral subscription revenue (7-day hold) and withdrawals via Stripe Connect
        </p>
        <p className="text-sm text-[#A0A0A0] mt-2">
          <Link href="/app/settings?tab=earnings" className="text-[#00FF94] underline">
            Manage in Settings
          </Link>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="p-6 rounded-2xl bg-gradient-to-br from-[#00FF94]/10 to-[#121212] border border-[#00FF94]/30">
          <div className="flex items-center gap-3 mb-3">
            <DollarSign className="text-[#00FF94]" size={20} />
            <span className="text-[#A0A0A0]">Available</span>
          </div>
          <p className="text-4xl font-bold text-[#00FF94] mb-1">{formatUsd(availableCents)}</p>
          <p className="text-sm text-[#A0A0A0]">Ready to withdraw (min {formatUsd(MIN_PAYOUT_CENTS)})</p>
        </div>

        <div className="p-6 rounded-2xl bg-[#121212] border border-[#00FF94]/20">
          <div className="flex items-center gap-3 mb-3">
            <Clock className="text-[#00FF94]" size={20} />
            <span className="text-[#A0A0A0]">Pending</span>
          </div>
          <p className="text-4xl font-bold text-[#E0E0E0] mb-1">{formatUsd(pendingCents)}</p>
          <p className="text-sm text-[#A0A0A0]">7-day hold from invoice</p>
        </div>

        <div className="p-6 rounded-2xl bg-[#121212] border border-[#00FF94]/20">
          <div className="flex items-center gap-3 mb-3">
            <TrendingUp className="text-[#00FF94]" size={20} />
            <span className="text-[#A0A0A0]">Total tracked</span>
          </div>
          <p className="text-4xl font-bold text-[#00FF94] mb-1">{formatUsd(lifetimeCents)}</p>
          <p className="text-sm text-[#A0A0A0]">Available + pending</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="p-6 rounded-2xl bg-[#121212] border border-[#00FF94]/20">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="text-[#00FF94]" size={24} />
            <div>
              <h2 className="text-xl font-bold">Stripe Connect</h2>
              <p className="text-sm text-[#A0A0A0]">Express account for payouts</p>
            </div>
          </div>
          {stripeConnected ? (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-[#00FF94]/10 border border-[#00FF94]/30 mb-4">
              <CheckCircle2 className="text-[#00FF94]" size={18} />
              <span className="text-[#00FF94] text-sm font-semibold">Linked</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-[#ff4444]/10 border border-[#ff4444]/30 mb-4">
              <AlertCircle className="text-[#ff4444]" size={18} />
              <span className="text-[#ff4444] text-sm font-semibold">Not connected</span>
            </div>
          )}
          <Button
            type="button"
            onClick={() => void connectStripe()}
            disabled={busy || flagged}
            className="w-full bg-[#00FF94] text-[#0A0A0A] hover:bg-[#00FF94]/90 gap-2"
          >
            {busy ? "Working…" : stripeConnected ? "Update bank details" : "Connect Stripe"}
            {!busy && <ExternalLink size={16} />}
          </Button>
        </div>

        <div className="p-6 rounded-2xl bg-[#121212] border border-[#00FF94]/20">
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="text-[#00FF94]" size={24} />
            <div>
              <h2 className="text-xl font-bold">Withdraw</h2>
              <p className="text-sm text-[#A0A0A0]">Transfer to your bank</p>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => void withdraw()}
            disabled={
              busy ||
              flagged ||
              !stripeConnected ||
              availableCents < MIN_PAYOUT_CENTS
            }
            className="w-full bg-[#00FF94] text-[#0A0A0A] hover:bg-[#00FF94]/90 disabled:opacity-50"
          >
            {busy ? "Processing…" : "Withdraw available balance"}
          </Button>
          {flagged && (
            <p className="text-xs text-[#ff4444] mt-3">Withdrawals are temporarily unavailable.</p>
          )}
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-[#121212] border border-[#00FF94]/20">
        <h2 className="text-xl font-bold mb-6">Payout history</h2>
        <div className="space-y-3">
          {history.length > 0 ? (
            history.map((payout) => (
              <div
                key={payout.id}
                className="flex items-center justify-between p-4 rounded-xl bg-[#0A0A0A] border border-[#00FF94]/10"
              >
                <div>
                  <p className="font-semibold">{formatUsd(payout.amountCents)}</p>
                  <p className="text-sm text-[#A0A0A0]">
                    {new Date(payout.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className="text-xs text-[#A0A0A0] font-mono truncate max-w-[140px]">
                  {payout.stripeTransferId}
                </span>
              </div>
            ))
          ) : (
            <p className="text-center text-[#A0A0A0] py-8">No withdrawals yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
