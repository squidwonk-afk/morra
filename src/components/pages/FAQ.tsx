"use client";

import { HelpCircle } from "lucide-react";

const faqs = [
  {
    question: "How do I earn money on MORRA?",
    answer:
      "You may earn referral rewards when people you refer have qualifying paid activity on morra.store, according to in-app rules. Rewards are not guaranteed, amounts can change, and MORRA may adjust or pause the program. See Terms of Service.",
  },
  {
    question: "How do referrals work?",
    answer:
      "You share your referral link or code. When someone creates an account and meets the program requirements, you may receive credits and/or revenue share according to the in-app tier rules. We may adjust or pause rewards if we detect abuse. Nothing promises a specific income level.",
  },
  {
    question: "How do I get paid?",
    answer:
      "Connect a Stripe Express account from your dashboard (Connect Stripe). After Stripe approves your onboarding and you have available earnings that meet any withdrawal rules in the app, you can request a payout where that feature is offered. All payouts are processed in USD. Money moves through Stripe to the bank account you add in Stripe, not as cash stored inside MORRA. Payouts are processed by Stripe and may be delayed.",
  },
  {
    question: "Why do I need to connect Stripe?",
    answer:
      "Stripe Connect handles identity verification and compliant payouts. MORRA does not collect your bank details directly; Stripe does, so you can receive referral earnings securely when you are eligible.",
  },
  {
    question: "When do I receive payouts?",
    answer:
      "After a withdrawal is sent, timing depends on Stripe and your bank (weekends, holidays, reviews). MORRA does not control Stripe's schedules or holds.",
  },
  {
    question: "What if I don’t connect Stripe?",
    answer:
      "You can still use morra.store for tools, credits, and subscriptions. You generally cannot receive referral cashouts until you complete Connect onboarding and meet any balance rules shown in the product.",
  },
  {
    question: "Are there fees?",
    answer:
      "Stripe may charge processing or payout fees according to their pricing. MORRA’s pricing for credits and subscriptions is shown at checkout. Check Stripe’s documentation for Connect- and transfer-related fees in your region.",
  },
  {
    question: "Can I withdraw instantly?",
    answer:
      "Not necessarily. Withdrawals are subject to minimum balance rules in the app, Stripe’s review of your account, bank transfer times, and any fraud or compliance checks. There is no promise of instant access to funds.",
  },
  {
    question: "What if my Stripe account is rejected?",
    answer:
      "Stripe makes onboarding decisions. If you cannot complete Connect, you may be unable to receive cash payouts on MORRA until the issue is resolved with Stripe. You can still use other parts of the Service where available.",
  },
  {
    question: "Why can't I withdraw my earnings?",
    answer:
      "Payout availability depends on Stripe and your country or region. Some locations have restrictions on certain transfers or Connect payout methods, and Stripe’s rules can change. You may need to use an alternative payout option if Stripe offers one for your account, or complete additional verification in Stripe. MORRA does not control Stripe’s eligibility decisions.",
  },
  {
    question: "Can I earn money if payouts aren't supported in my country?",
    answer:
      "Yes. You can still earn credits, use tools, refer others, and participate in programs like Song Wars on morra.store. Cash withdrawal of referral balances depends on whether Stripe Connect and payouts are available for your situation; not all users in all regions can receive bank payouts. Check Stripe’s documentation for your country or use the AI assistant on morra.store if you need help.",
  },
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
      "XP (experience points) reward consistent engagement on morra.store, for example, daily activity and qualifying usage, subject to fair-use and anti-abuse checks. XP can unlock tiers or in-product rewards as shown in the app. XP does not represent monetary value and may be adjusted to protect platform integrity.",
  },
  {
    question: "What is MORRA?",
    answer:
      "MORRA is a professional AI platform for music artists on morra.store: bios and promo copy, release planning, lyric insights, cover concepts, and more, designed around an artist workflow.",
  },
  {
    question: "What is Song Wars?",
    answer:
      "Song Wars is a bi-weekly-style tournament on morra.store: up to 30 artists per event with a waitlist for overflow, up to three public track links per artist, and four AI judge personas that score and comment. Rounds narrow the field (including a top-40% style cut after round one) before final rankings. Prizes are credits, not cash, and differ for free vs active paid subscribers. Nothing guarantees a win, placement, or judge outcome. You are responsible for links and lyrics you submit and for rights in your content. Judging is AI-generated for engagement and feedback, not professional A&R. See Terms for full disclaimers.",
  },
  {
    question: "How do Song Wars notifications work?",
    answer:
      "You may receive in-app notifications when you join, when you are promoted from the waitlist, and when results or prizes are applied. Turn on or check notifications via the bell in the nav where available.",
  },
  {
    question: "How does leveling relate to my subscription?",
    answer:
      "Your level and XP reflect engagement; your subscription plan defines billing and included credits. You can level up on any tier, free or paid, according to the rules shown in the product.",
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
      "MORRA includes core tools such as artist identity and promo copy, release rollout planning, lyric analysis, cover art concepts, and collaboration features, availability depends on your plan and credits.",
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
