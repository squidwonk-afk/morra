"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Sparkles, MessageCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CREDIT_COSTS } from "@/lib/constants/credits";
import {
  CREDIT_PACKS,
  CREDIT_PACK_KEYS,
  PLANS,
  PLAN_KEYS,
} from "@/lib/pricing";

const subscriptionHelp = PLAN_KEYS.map(
  (k) => `• ${PLANS[k].name}: ${PLANS[k].price}/mo, ${PLANS[k].credits} credits/mo`
).join("\n");

const packsHelp = CREDIT_PACK_KEYS.map(
  (k) =>
    `• ${CREDIT_PACKS[k].name}: ${CREDIT_PACKS[k].credits} credits, ${CREDIT_PACKS[k].price}`
).join("\n");

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface MorraAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  contextTool?: string;
}

const suggestedPrompts = [
  "How do credits work?",
  "Explain the referral system",
  "Help me plan a release",
  "How does leveling work?"
];

const faqResponses: Record<string, string> = {
  credits: `MORRA uses credits per tool run:\n\n• Artist Identity: ${CREDIT_COSTS.identity} credits\n• Rollout: ${CREDIT_COSTS.rollout} credits\n• Lyrics: ${CREDIT_COSTS.lyrics} credits (depth may vary)\n• Cover: ${CREDIT_COSTS.cover} credits\n• Collab: ${CREDIT_COSTS.collab} credits\n\nSubscriptions (Stripe, monthly invoice):\n${subscriptionHelp}\n\nCredit packs (one-time checkout):\n${packsHelp}\n\nFree: 1 generation per rolling 24h without spending credits. Bonus credits from leveling and referrals.`,
  
  referrals:
    "You **may earn** based on referrals when program rules and qualifying activity are met—see **Referrals** in the app. MORRA does **not** promise income or **guaranteed** payouts. Tiers and rates can change; we may pause rewards for abuse. Connect Stripe to withdraw **available** earnings only; new amounts start in **pending** and usually clear after about **10 days** (hold from accrual). **All payouts are in USD.**",

  payouts:
    "MORRA uses Stripe for subscriptions, credit packs, and optional referral withdrawals.\n\n• You **may** withdraw **available USD** if you connect Stripe (Express) and meet the minimum in the app (often $5).\n• **Pending** balances are not withdrawable until they clear the hold (~10 days from accrual).\n• **Payouts are processed by Stripe and may be delayed** (reviews, bank timing).\n• MORRA does not store bank details for payouts—Stripe does.\n• Nothing here is financial or tax advice; **no dollar amount is guaranteed**.\n• Payouts may be limited to once per hour for safety.",
  
  "leveling": "MORRA features a 20-level XP progression system:\n\n✨ Earn XP from:\n• +10 XP per tool generation\n• +25 XP daily login bonus\n• +50 XP when someone signs up with your link\n• +100 XP when a referral subscribes\n• Streak bonuses for consistency\n\n🎁 Each level unlocks rewards:\n• Bonus credits (25-750 per level)\n• Exclusive titles like 'Rising Artist' or 'Underground Legend'\n• Special badges to show your dedication\n\nYour level is separate from your subscription - it shows your activity and commitment to your craft!",
  
  "release": "Planning a release? Here's a proven strategy:\n\n1️⃣ Start 8-12 weeks before release date\n2️⃣ Use MORRA's Rollout Planner to create your timeline\n3️⃣ Generate multiple bio variations for different platforms\n4️⃣ Analyze your lyrics to refine messaging\n5️⃣ Create cover art concepts early for testing\n6️⃣ Build anticipation with teasers 2-4 weeks out\n7️⃣ Use CollabFinder to connect with potential features\n\nThe Rollout Planner tool guides you through each phase with industry-proven templates!",
  
  upgrade: `Plans and packs (same numbers as Pricing / Settings / Stripe):\n\n🆓 Free: 1 generation / rolling 24h\n${subscriptionHelp}\n\nCredit packs:\n${packsHelp}\n\nManage billing in Settings. Stripe is the source of truth for charges.`,
  
  "pin": "If you lose your PIN:\\n\\n⚠️ Important: Store your PIN securely as MORRA doesn't use email recovery for maximum privacy.\\n\\nPIN Security Tips:\\n• Save it in a secure password manager\\n• Write it down in a safe place\\n• Don't share it with anyone\\n\\nSince MORRA prioritizes your privacy with username-only authentication, keeping your PIN secure is crucial. The Assistant can help you with everything else!",
  
  bio: `The Artist Identity tool creates professional bios and EPK content:\\n\\n• Multiple length variations (short, medium, long)\\n• Tailored for different platforms (Spotify, Instagram, press kits)\\n• Captures your unique sound and story\\n• Optimized for discovery and engagement\\n\\nTips for best results:\\n1️⃣ Be specific about your genre and influences\\n2️⃣ Mention your biggest achievements or goals\\n3️⃣ Include your creative process or story\\n4️⃣ Generate 2-3 versions to find the perfect fit\\n\\nCost: ${CREDIT_COSTS.identity} credits per generation`,

  lyrics: `The Lyric Analyzer gives you flow insights and feedback:\n\n• Rhyme scheme analysis\n• Syllable patterns and flow consistency\n• Metaphor and wordplay evaluation\n• Emotional impact assessment\n• Improvement suggestions\n\nBest practices:\n• Analyze before finalizing your lyrics\n• Iterate 2-3 times for best results\n• Compare different versions to see what works\n• Use feedback to strengthen weak spots\n\nCost: from ${CREDIT_COSTS.lyrics} credits depending on depth`,

  cover: `Cover Studio generates art concepts and visual direction:\n\n• Multiple style variations\n• Color palette recommendations\n• Typography suggestions\n• Mood board references\n• Art direction brief for designers\n\nThese are concepts, not final art - perfect for:\n• Briefing designers or artists\n• Testing visual direction with your audience\n• Exploring different aesthetic approaches\n• Creating cohesive visual branding\n\nCost: ${CREDIT_COSTS.cover} credits per generation`,
};

function detectFAQIntent(message: string): string | null {
  const lowercaseMsg = message.toLowerCase();
  
  if (lowercaseMsg.includes("credit") || lowercaseMsg.includes("pricing") || lowercaseMsg.includes("cost")) {
    return "credits";
  }
  if (
    lowercaseMsg.includes("stripe connect") ||
    lowercaseMsg.includes("payout") ||
    lowercaseMsg.includes("get paid") ||
    lowercaseMsg.includes("withdraw") ||
    lowercaseMsg.includes("bank account")
  ) {
    return "payouts";
  }
  if (lowercaseMsg.includes("referral") || lowercaseMsg.includes("refer") || lowercaseMsg.includes("earn") || lowercaseMsg.includes("money")) {
    return "referrals";
  }
  if (lowercaseMsg.includes("level") || lowercaseMsg.includes("xp") || lowercaseMsg.includes("experience")) {
    return "leveling";
  }
  if (lowercaseMsg.includes("release") || lowercaseMsg.includes("rollout") || lowercaseMsg.includes("launch")) {
    return "release";
  }
  if (lowercaseMsg.includes("upgrade") || lowercaseMsg.includes("plan") || lowercaseMsg.includes("subscription")) {
    return "upgrade";
  }
  if (lowercaseMsg.includes("pin") || lowercaseMsg.includes("password") || lowercaseMsg.includes("recover") || lowercaseMsg.includes("lost")) {
    return "pin";
  }
  if (lowercaseMsg.includes("bio") || lowercaseMsg.includes("identity") || lowercaseMsg.includes("epk")) {
    return "bio";
  }
  if (lowercaseMsg.includes("lyric") || lowercaseMsg.includes("analyze") || lowercaseMsg.includes("flow")) {
    return "lyrics";
  }
  if (lowercaseMsg.includes("cover") || lowercaseMsg.includes("art") || lowercaseMsg.includes("artwork")) {
    return "cover";
  }
  
  return null;
}

export function MorraAssistant({ isOpen, onClose, contextTool }: MorraAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hey! I'm the MORRA Assistant. I'm here to help you understand features, solve issues, and guide you through using the platform.\n\nWhat can I help you with today?",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Add context-aware greeting if contextTool is provided
  useEffect(() => {
    if (contextTool && messages.length === 1) {
      const contextMessages: Record<string, string> = {
        "identity": "I see you're in the Artist Identity tool. Want tips on creating compelling bios?",
        "lyrics": "Using the Lyric Analyzer? I can help you get the most out of your analysis!",
        "rollout": "Planning a release? I can guide you through the rollout strategy!",
        "cover": "Working on cover art? Let me know if you need direction on visual concepts!"
      };

      if (contextMessages[contextTool]) {
        setMessages(prev => [...prev, {
          id: `context-${Date.now()}`,
          role: "assistant",
          content: contextMessages[contextTool],
          timestamp: new Date()
        }]);
      }
    }
  }, [contextTool]);

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsThinking(true);

    let responseContent: string;

    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: text }),
      });
      const j = (await r.json()) as { ok?: boolean; reply?: string };
      if (r.ok && j.reply) {
        responseContent = j.reply;
      } else {
        throw new Error("api");
      }
    } catch {
      const faqIntent = detectFAQIntent(text);
      if (faqIntent && faqResponses[faqIntent]) {
        responseContent = faqResponses[faqIntent];
      } else {
        responseContent =
          "I'm in mock mode offline. Try asking about credits, referrals, leveling, releases, bios, lyrics, or cover art, or check the FAQ.";
      }
    }

    const assistantMessage: Message = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: responseContent,
      timestamp: new Date(),
    };

    setIsThinking(false);
    setMessages((prev) => [...prev, assistantMessage]);
  };

  const handlePromptClick = (prompt: string) => {
    setInputValue(prompt);
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:p-6 pointer-events-none">
      <div 
        className="w-full sm:w-[420px] h-[600px] rounded-2xl bg-[#0A0A0A] border-2 border-[#00FF94]/30 shadow-[0_0_60px_rgba(0,255,148,0.3)] flex flex-col pointer-events-auto overflow-hidden"
        style={{
          animation: "assistantSlideIn 0.3s ease-out"
        }}
      >
        {/* Header */}
        <div className="p-4 border-b border-[#00FF94]/20 bg-gradient-to-r from-[#0A0A0A] to-[#121212] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00FF94] to-[#9BFF00] flex items-center justify-center shadow-[0_0_20px_rgba(0,255,148,0.4)]">
              <Sparkles className="text-[#0A0A0A]" size={20} />
            </div>
            <div>
              <h3 className="font-bold text-white">MORRA Assistant</h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#00FF94] animate-pulse" />
                <p className="text-xs text-[#00FF94]">Instant Answers</p>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-[#A0A0A0] hover:text-white hover:bg-[#00FF94]/10"
          >
            <X size={20} />
          </Button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-[#00FF94]/20 scrollbar-track-transparent">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-fadeIn`}
            >
              <div
                className={`max-w-[85%] px-4 py-3 rounded-2xl ${
                  message.role === "user"
                    ? "bg-gradient-to-br from-[#00FF94] to-[#9BFF00] text-[#0A0A0A] shadow-[0_0_20px_rgba(0,255,148,0.3)]"
                    : "bg-[#121212] border border-[#00FF94]/20 text-white"
                }`}
                style={{
                  animation: "messageSlideIn 0.3s ease-out"
                }}
              >
                <p className="text-sm leading-relaxed whitespace-pre-line">{message.content}</p>
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="flex justify-start animate-fadeIn">
              <div className="bg-[#121212] border border-[#00FF94]/20 px-4 py-3 rounded-2xl">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-[#00FF94] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-[#00FF94] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-[#00FF94] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="text-sm text-[#A0A0A0]">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompts */}
        {messages.length <= 2 && (
          <div className="px-4 pb-3 flex flex-wrap gap-2">
            {suggestedPrompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => handlePromptClick(prompt)}
                className="px-3 py-1.5 text-xs rounded-full bg-[#121212] border border-[#00FF94]/30 text-[#00FF94] hover:bg-[#00FF94]/10 hover:border-[#00FF94]/50 transition-all"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t border-[#00FF94]/20 bg-gradient-to-r from-[#0A0A0A] to-[#121212]">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask anything about MORRA..."
              className="flex-1 px-4 py-3 rounded-xl bg-[#121212] border border-[#00FF94]/30 text-white placeholder:text-[#A0A0A0] focus:outline-none focus:border-[#00FF94] focus:shadow-[0_0_20px_rgba(0,255,148,0.2)] transition-all"
            />
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim() || isThinking}
              className="px-4 py-3 rounded-xl bg-gradient-to-br from-[#00FF94] to-[#9BFF00] text-[#0A0A0A] hover:shadow-[0_0_30px_rgba(0,255,148,0.5)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Send size={20} />
            </Button>
          </div>

          {/* Privacy Note */}
          <p className="text-xs text-[#A0A0A0] mt-2 text-center">
            🔒 Your chats stay private • No tracking
          </p>
        </div>

        {/* Disclaimer */}
        <div className="px-4 pb-3 text-center">
          <p className="text-xs text-[#A0A0A0]">
            Assistant may occasionally be inaccurate. Verify important details.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes assistantSlideIn {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes messageSlideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }

        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }

        .scrollbar-thumb-\\[\\#00FF94\\]\\/20::-webkit-scrollbar-thumb {
          background-color: rgba(0, 255, 148, 0.2);
          border-radius: 3px;
        }

        .scrollbar-thumb-\\[\\#00FF94\\]\\/20::-webkit-scrollbar-thumb:hover {
          background-color: rgba(0, 255, 148, 0.4);
        }

        .scrollbar-track-transparent::-webkit-scrollbar-track {
          background: transparent;
        }
      `}</style>
    </div>
  );
}