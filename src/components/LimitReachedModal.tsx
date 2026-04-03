import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import Link from "next/link";
import { Sparkles, Zap, Crown, CreditCard } from "lucide-react";
import {
  CREDIT_PACKS,
  CREDIT_PACK_KEYS,
  PLANS,
  PLAN_KEYS,
  type CreditPackKey,
  type PlanKey,
} from "@/lib/pricing";
import { useMorraCheckout } from "@/hooks/use-morra-checkout";
import type { ToolBlockReason } from "@/lib/client/tool-api-error";

interface LimitReachedModalProps {
  isOpen: boolean;
  onClose: () => void;
  blockReason?: ToolBlockReason | null;
}

export function LimitReachedModal({
  isOpen,
  onClose,
  blockReason = "insufficient_credits",
}: LimitReachedModalProps) {
  const { startCheckout, busy } = useMorraCheckout();

  const title =
    blockReason === "free_tier_limit"
      ? "Free generation used"
      : "Out of credits";

  const description =
    blockReason === "free_tier_limit"
      ? "You've used your free generation for this rolling window. Buy credits or subscribe to keep creating."
      : "Add a credit pack or upgrade your plan to continue.";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#121212] border-[#00FF94]/30 text-white max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center mb-2">
            {title}
          </DialogTitle>
          <DialogDescription className="text-[#A0A0A0] text-center">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#00FF94] to-[#9BFF00] mb-4 shadow-[0_0_30px_rgba(0,255,148,0.4)]">
              <Crown className="text-[#0A0A0A]" size={32} />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-[#00FF94] flex items-center gap-2">
              <CreditCard size={16} />
              Credit packs
            </p>
            <div className="grid grid-cols-2 gap-2">
              {CREDIT_PACK_KEYS.map((key) => {
                const p = CREDIT_PACKS[key];
                return (
                  <Button
                    key={key}
                    type="button"
                    disabled={busy}
                    variant="outline"
                    className="h-auto py-3 flex-col border-[#00FF94]/30 text-[#00FF94] hover:bg-[#00FF94]/10"
                    onClick={() =>
                      void startCheckout({ type: "credits", pack: key as CreditPackKey })
                    }
                  >
                    <span className="font-bold">{p.name}</span>
                    <span className="text-xs text-[#A0A0A0]">
                      {p.credits} cr · ${p.price}
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-[#00FF94] flex items-center gap-2">
              <Sparkles size={16} />
              Subscriptions (monthly credits)
            </p>
            <div className="space-y-2">
              {PLAN_KEYS.map((key) => {
                const pl = PLANS[key];
                return (
                  <Button
                    key={key}
                    type="button"
                    disabled={busy}
                    className="w-full justify-between bg-[#0A0A0A] border border-[#00FF94]/25 text-white hover:bg-[#00FF94]/10"
                    variant="outline"
                    onClick={() =>
                      void startCheckout({ type: "subscription", plan: key as PlanKey })
                    }
                  >
                    <span>
                      {pl.name}, {pl.credits} credits/mo
                    </span>
                    <span className="text-[#00FF94]">${pl.price}/mo</span>
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3 bg-[#0A0A0A] p-4 rounded-xl border border-[#00FF94]/20">
            <div className="flex items-center gap-3">
              <Zap className="text-[#00FF94]" size={20} />
              <p className="text-sm">Prices match Stripe Checkout, no surprises.</p>
            </div>
          </div>

          <Link href="/app/settings" onClick={onClose}>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-[#A0A0A0] hover:text-white"
            >
              Open Settings for full billing options
            </Button>
          </Link>

          <div className="text-center pt-2 border-t border-[#00FF94]/10">
            <p className="text-xs text-[#A0A0A0]">
              Fair usage keeps MORRA sustainable for all creators
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
