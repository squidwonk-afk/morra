"use client";

import { MessageCircle, HelpCircle, Sparkles } from "lucide-react";
import { useAssistant } from "@/contexts/AssistantContext";

export function AssistantWidget() {
  const { openAssistant } = useAssistant();

  return (
    <div 
      onClick={openAssistant}
      className="p-6 rounded-2xl bg-gradient-to-br from-[#00FF94]/10 to-[#121212] border border-[#00FF94]/30 hover:border-[#00FF94]/50 hover:shadow-[0_0_30px_rgba(0,255,148,0.2)] transition-all cursor-pointer group"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00FF94] to-[#9BFF00] flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_rgba(0,255,148,0.3)] group-hover:shadow-[0_0_30px_rgba(0,255,148,0.5)] transition-all">
          <MessageCircle className="text-[#0A0A0A]" size={24} />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold mb-2 group-hover:text-[#00FF94] transition-colors">
            Need Help?
          </h3>
          <p className="text-[#A0A0A0] text-sm mb-4">
            Get instant answers about features, credits, leveling, and more.
          </p>
          <div className="flex items-center gap-2 text-[#00FF94] text-sm">
            <Sparkles size={16} />
            <span>Ask MORRA Assistant</span>
          </div>
        </div>
      </div>
    </div>
  );
}