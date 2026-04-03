"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  User,
  Calendar,
  Music,
  Image,
  Users,
  Sparkles,
  Check,
  ArrowRight,
} from "lucide-react";
import { useMorraUser } from "@/contexts/MorraUserContext";
import { useMorraCheckout } from "@/hooks/use-morra-checkout";
import { PLAN_FEATURE_BULLETS, PLANS, PLAN_KEYS, type PlanKey } from "@/lib/pricing";

const features = [
  {
    icon: User,
    title: "Artist Bio Generator",
    description: "Create compelling bios, EPKs, and press materials in seconds."
  },
  {
    icon: Calendar,
    title: "Release Planner",
    description: "Plan your rollout with timeline tasks and content ideas."
  },
  {
    icon: Music,
    title: "Lyric Analyzer",
    description: "Get insights on flow, rhyme density, and emotional analysis."
  },
  {
    icon: Image,
    title: "Cover Art Studio",
    description: "Generate detailed concepts and AI prompts for your artwork."
  },
  {
    icon: Users,
    title: "Collab Finder",
    description: "Connect with artists who match your vibe and genre."
  },
  {
    icon: Sparkles,
    title: "Creative Intelligence",
    description: "All tools powered by AI trained for the music industry."
  },
];

const testimonials = [
  {
    name: "Luna Park",
    role: "Producer",
    text: "MORRA helped me go from idea to release in half the time. The rollout planner is a game changer."
  },
  {
    name: "VIXN",
    role: "Rapper",
    text: "Finally, a tool that actually understands underground music culture. Not some corporate BS."
  },
  {
    name: "Neon Dreams",
    role: "Singer-Songwriter",
    text: "The lyric analyzer gave me insights I never would have caught. Level up your craft with this."
  },
];

export function Landing() {
  const { me } = useMorraUser();
  const { startCheckout, busy } = useMorraCheckout();
  const loggedIn = Boolean(me?.user);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#00FF94]/5 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 relative">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-[#00FF94] to-[#9BFF00] bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-4 duration-1000 pb-2">
              Your Creative Intelligence Engine
            </h1>
            <p className="text-xl md:text-2xl text-[#A0A0A0] mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
              Build your identity. Plan your drops. Level up your art.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
              <Link href="/signup">
                <Button 
                  size="lg" 
                  className="bg-[#00FF94] text-[#0A0A0A] hover:bg-[#00FF94]/90 shadow-[0_0_30px_rgba(0,255,148,0.4)] hover:shadow-[0_0_40px_rgba(0,255,148,0.6)] transition-all text-lg px-8"
                >
                  Start Free with Daily Access
                  <ArrowRight className="ml-2" size={20} />
                </Button>
              </Link>
              <Link href="/app">
                <Button 
                  size="lg" 
                  variant="outline"
                  className="border-[#00FF94]/30 text-[#00FF94] hover:bg-[#00FF94]/10 hover:border-[#00FF94] text-lg px-8"
                >
                  See Demo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-gradient-to-b from-transparent to-[#121212]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Everything You Need</h2>
            <p className="text-xl text-[#A0A0A0]">Tools designed for underground artists</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div 
                  key={index}
                  className="p-6 rounded-2xl bg-[#121212] border border-[#00FF94]/20 hover:border-[#00FF94]/50 transition-all hover:shadow-[0_0_30px_rgba(0,255,148,0.2)] group"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#00FF94]/10 flex items-center justify-center mb-4 group-hover:shadow-[0_0_20px_rgba(0,255,148,0.4)] transition-all">
                    <Icon className="text-[#00FF94]" size={24} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-[#A0A0A0]">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Loved by Artists</h2>
            <p className="text-xl text-[#A0A0A0]">See what creators are saying</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <div 
                key={index}
                className="p-6 rounded-2xl bg-[#121212] border border-[#00FF94]/20"
              >
                <p className="text-[#A0A0A0] mb-4 italic">
                  &quot;{testimonial.text}&quot;
                </p>
                <div>
                  <p className="font-bold text-white">{testimonial.name}</p>
                  <p className="text-sm text-[#A0A0A0]">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 bg-gradient-to-b from-transparent to-[#121212]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Simple Pricing</h2>
            <p className="text-xl text-[#A0A0A0]">Choose the plan that fits your workflow</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            <div className="p-8 rounded-2xl border relative bg-[#121212] border-[#00FF94]/20 flex flex-col">
              <h3 className="text-2xl font-bold mb-2">Free</h3>
              <div className="mb-4">
                <span className="text-4xl font-bold text-[#00FF94]">$0</span>
              </div>
              <p className="text-[#A0A0A0] mb-6">1 generation / rolling 24h</p>
              <ul className="space-y-3 mb-8 flex-1">
                {["Try all core tools with daily access", "AI Assistant", "Leveling & referrals"].map((f, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="text-[#00FF94] flex-shrink-0 mt-0.5" size={20} />
                    <span className="text-[#A0A0A0]">{f}</span>
                  </li>
                ))}
              </ul>
              <Link href={loggedIn ? "/app" : "/signup"} className="mt-auto">
                <Button className="w-full bg-[#121212] text-[#00FF94] border border-[#00FF94]/30 hover:bg-[#00FF94]/10">
                  {loggedIn ? "Dashboard" : "Get Started"}
                </Button>
              </Link>
            </div>

            {PLAN_KEYS.map((key) => {
              const p = PLANS[key];
              const isPro = key === "pro";
              const isElite = key === "elite";
              const cardClass = isPro
                ? "p-8 rounded-2xl border-2 border-[#00FF94] bg-gradient-to-b from-[#00FF94]/10 to-[#121212] shadow-[0_0_40px_rgba(0,255,148,0.28)] relative flex flex-col md:scale-[1.02]"
                : isElite
                  ? "p-8 rounded-2xl border bg-[#121212] border-[#9BFF00]/35 ring-1 ring-[#9BFF00]/20 relative flex flex-col"
                  : "p-8 rounded-2xl border bg-[#121212] border-[#00FF94]/20 relative flex flex-col";
              const bullets = PLAN_FEATURE_BULLETS[key];
              return (
                <div key={key} className={cardClass}>
                  {isPro && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#00FF94] text-[#0A0A0A] text-xs font-bold uppercase tracking-wide whitespace-nowrap">
                      Best Value
                    </div>
                  )}
                  {isElite && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#9BFF00]/20 text-[#9BFF00] text-xs font-bold uppercase tracking-wide border border-[#9BFF00]/40 whitespace-nowrap">
                      Elite
                    </div>
                  )}
                  <h3 className={`text-2xl font-bold mb-2 ${isPro ? "mt-3" : isElite ? "mt-3" : ""}`}>{p.name}</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-[#00FF94]">${p.price}</span>
                    <span className="text-[#A0A0A0]">/month</span>
                  </div>
                  <p className="text-[#A0A0A0] text-sm mb-4">{p.credits} credits / month</p>
                  {(isPro || isElite) && (
                    <p className="text-xs font-semibold text-[#00FF94] mb-3">
                      {isPro ? "Everything in Starter +" : "Everything in Pro +"}
                    </p>
                  )}
                  <ul className="space-y-3 mb-8 flex-1">
                    {bullets.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <Check className="text-[#00FF94] flex-shrink-0 mt-0.5" size={20} />
                        <span className="text-[#A0A0A0]">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {loggedIn ? (
                    <Button
                      type="button"
                      disabled={busy}
                      className={`w-full mt-auto ${
                        isPro
                          ? "bg-[#00FF94] text-[#0A0A0A] hover:bg-[#00FF94]/90 shadow-[0_0_20px_rgba(0,255,148,0.35)] font-semibold"
                          : "bg-[#121212] text-[#00FF94] border border-[#00FF94]/30 hover:bg-[#00FF94]/10"
                      }`}
                      onClick={() => void startCheckout({ type: "subscription", plan: key as PlanKey })}
                    >
                      Subscribe · ${p.price}/mo
                    </Button>
                  ) : (
                    <Link href="/signup" className="mt-auto block">
                      <Button
                        className={`w-full ${
                          isPro
                            ? "bg-[#00FF94] text-[#0A0A0A] hover:bg-[#00FF94]/90 shadow-[0_0_20px_rgba(0,255,148,0.35)] font-semibold"
                            : "bg-[#121212] text-[#00FF94] border border-[#00FF94]/30 hover:bg-[#00FF94]/10"
                        }`}
                      >
                        Get Started
                      </Button>
                    </Link>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-center text-[#A0A0A0] mt-8">
            Free: 1 generation per rolling 24 hours. Paid tiers billed through Stripe.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Level Up?
          </h2>
          <p className="text-xl text-[#A0A0A0] mb-8">
            Join hundreds of artists building their creative empire
          </p>
          <Link href="/signup">
            <Button 
              size="lg"
              className="bg-[#00FF94] text-[#0A0A0A] hover:bg-[#00FF94]/90 shadow-[0_0_30px_rgba(0,255,148,0.4)] hover:shadow-[0_0_40px_rgba(0,255,148,0.6)] transition-all text-lg px-12"
            >
              Start Creating Now
              <ArrowRight className="ml-2" size={20} />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}