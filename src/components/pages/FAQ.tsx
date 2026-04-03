"use client";

import { HelpCircle } from "lucide-react";

const faqs = [
  {
    question: "How do credits work?",
    answer:
      "Credits are spent when you run paid AI operations on morra.store (for example, tool generations). Your balance is shown in the app. Credit packs add to your balance at purchase. Subscription plans may include a recurring monthly credit allowance according to the plan you choose. Specific costs per tool are shown before you generate.",
  },
  {
    question: "How do subscriptions work?",
    answer:
      "Subscriptions are billed through Stripe on a recurring basis until you cancel. Each plan includes a defined set of features and may include monthly credits. Access to subscription benefits is tied to an active subscription on your morra.store account. Billing details and renewal timing appear in the Stripe customer billing portal.",
  },
  {
    question: "What is your refund policy?",
    answer:
      "Credits and prepaid purchases are generally non-refundable except where required by applicable law. Subscription charges that have already been processed follow the same principle unless the law requires otherwise. If you believe there is a billing error, use the AI assistant on morra.store so we can review your case in line with our Terms and legal obligations.",
  },
  {
    question: "How do I cancel my subscription?",
    answer:
      "Cancel anytime through the Stripe Customer Portal. In the app, open your account or billing settings and choose Manage subscription (or equivalent) to open the portal. There you can turn off auto-renewal and update payment methods. You typically keep access through the end of the paid period unless stated otherwise at checkout.",
  },
  {
    question: "How does the XP system work?",
    answer:
      "XP (experience points) reward consistent engagement on morra.store—for example, daily activity and qualifying usage—subject to fair-use and anti-abuse checks. XP can unlock tiers or in-product rewards as shown in the app. XP does not represent monetary value and may be adjusted to protect platform integrity.",
  },
  {
    question: "What is MORRA?",
    answer:
      "MORRA is a professional AI platform for music artists on morra.store: bios and promo copy, release planning, lyric insights, cover concepts, and more—designed around an artist workflow.",
  },
  {
    question: "How does leveling relate to my subscription?",
    answer:
      "Your level and XP reflect engagement; your subscription plan defines billing and included credits. You can level up on any tier—free or paid—according to the rules shown in the product.",
  },
  {
    question: "What is daily free access?",
    answer:
      "Where available, free-tier users may receive limited daily generations on morra.store. Limits, rollover behavior, and reset timing are shown in the app and may change as we improve the product.",
  },
  {
    question: "How does MORRA prevent abuse?",
    answer:
      "We apply rate limits, daily caps where applicable, and automated checks so the service stays fair and sustainable for all artists. Referral or revenue features may require meaningful, legitimate usage as described in the product or Terms.",
  },
  {
    question: "How do referrals work?",
    answer:
      "You may share your referral link with other artists. When they sign up and maintain qualifying paid activity, you can earn rewards according to the current referral program on morra.store. Details and eligibility appear in-app.",
  },
  {
    question: "Do I need an email address?",
    answer:
      "morra.store uses username and PIN sign-in. Keep your PIN safe; store it in a password manager. For account and billing questions, use the AI assistant on morra.store.",
  },
  {
    question: "What if I lose my PIN?",
    answer:
      "Your PIN protects your account. If you lose it, you may lose access to the account. The AI assistant on morra.store can explain recovery options that apply to your situation.",
  },
  {
    question: "What tools are included?",
    answer:
      "MORRA includes core tools such as artist identity and promo copy, release rollout planning, lyric analysis, cover art concepts, and collaboration features—availability depends on your plan and credits.",
  },
  {
    question: "Do you store my lyrics or inputs?",
    answer:
      "We process inputs to deliver results. Retention practices are described in our Privacy Policy on morra.store. We do not sell your personal data.",
  },
  {
    question: "Can I use generated content commercially?",
    answer:
      "Many artists use outputs commercially. You are responsible for reviewing AI output and for compliance with law and third-party rights. See our Terms of Service on morra.store.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "Payments are processed by Stripe (major cards and other methods Stripe supports for your region). We do not store full card numbers on our servers.",
  },
  {
    question: "What is the MORRA Assistant?",
    answer:
      "The MORRA AI Assistant is your in-product guide on morra.store for questions about features, billing concepts, credits, and navigation. Users can contact support via the AI assistant on morra.store.",
  },
];

export function FAQ() {
  return (
    <div className="min-h-screen py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="w-16 h-16 rounded-full bg-[#00FF94]/10 flex items-center justify-center mx-auto mb-6">
            <HelpCircle className="text-[#00FF94]" size={32} />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-4">
            Frequently Asked <span className="text-[#00FF94]">Questions</span>
          </h1>
          <p className="text-xl text-[#A0A0A0] max-w-2xl mx-auto">
            Credits, subscriptions, XP, and how to get help on <strong className="text-white">morra.store</strong>
          </p>
        </div>

        <div className="space-y-6">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="p-6 rounded-2xl bg-[#121212] border border-[#00FF94]/20 hover:border-[#00FF94]/50 transition-all"
            >
              <h3 className="text-xl font-bold text-white mb-3">{faq.question}</h3>
              <p className="text-[#A0A0A0] leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>

        <div
          id="ai-assistant"
          className="mt-16 p-8 rounded-2xl bg-gradient-to-r from-[#00FF94]/10 to-[#9BFF00]/10 border border-[#00FF94]/30 text-center"
        >
          <h2 className="text-2xl font-bold text-white mb-4">Still have questions?</h2>
          <p className="text-[#A0A0A0] mb-6 max-w-xl mx-auto leading-relaxed">
            Open the MORRA AI Assistant in the app for personalized help. Users can contact support via the AI assistant on morra.store.
          </p>
          <button
            type="button"
            className="px-8 py-3 rounded-xl bg-[#00FF94] text-[#0A0A0A] hover:bg-[#00FF94]/90 font-semibold shadow-[0_0_20px_rgba(0,255,148,0.3)] transition-all"
            onClick={() => {
              const event = new CustomEvent("openAssistant");
              window.dispatchEvent(event);
            }}
          >
            Open AI Assistant
          </button>
          <p className="text-xs text-[#A0A0A0] mt-4">Available from morra.store when you are signed in</p>
        </div>
      </div>
    </div>
  );
}
