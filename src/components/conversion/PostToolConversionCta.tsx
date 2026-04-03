"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

type Props = {
  className?: string;
};

/** Soft upsell after a successful tool run — does not change tool behavior. */
export function PostToolConversionCta({ className = "" }: Props) {
  return (
    <div
      className={`rounded-2xl border border-[#00FF94]/20 bg-gradient-to-r from-[#00FF94]/6 to-transparent p-5 transition-opacity duration-300 ${className}`}
    >
      <div className="flex flex-wrap items-start gap-4 justify-between">
        <div className="flex gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-[#00FF94]/12 flex items-center justify-center shrink-0">
            <Sparkles className="text-[#00FF94]" size={20} />
          </div>
          <div>
            <p className="font-semibold text-[#E8E8E8]">Go deeper with Pro tools</p>
            <p className="text-sm text-[#808080] mt-0.5 max-w-md">
              Subscriptions and packs unlock more runs, higher caps, and the full release stack.
            </p>
          </div>
        </div>
        <Button asChild className="bg-[#00FF94] text-[#0A0A0A] hover:bg-[#00FF94]/90 shrink-0">
          <Link href="/app/pricing" className="inline-flex items-center gap-2">
            View plans <ArrowRight size={16} />
          </Link>
        </Button>
      </div>
    </div>
  );
}
