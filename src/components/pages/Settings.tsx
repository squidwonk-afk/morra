"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { 
  User, 
  CreditCard, 
  Shield, 
  Sparkles, 
  Gift, 
  DollarSign,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  History,
  Award
} from "lucide-react";
import { LevelBadge } from "@/components/LevelBadge";
import { getLevelProgress } from "@/lib/gamification";
import { useMorraUser } from "@/contexts/MorraUserContext";
import { useMorraCheckout } from "@/hooks/use-morra-checkout";
import {
  CREDIT_PACKS,
  CREDIT_PACK_KEYS,
  PLANS,
  isPlanKey,
  monthlySubscriptionCreditsForUserPlan,
  type CreditPackKey,
} from "@/lib/pricing";
import { useEffect, useState } from "react";
import { displayUsername } from "@/lib/profile/username";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  StripeOnboardingRegionNote,
  StripePayoutWithdrawClarifications,
  stripeErrorSuggestsRegionalLimit,
} from "@/components/legal/StripePayoutRegionMessaging";

export function Settings() {
  const { me, refresh } = useMorraUser();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [currentTitle, setCurrentTitle] = useState("Rising Artist");
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [earnBusy, setEarnBusy] = useState(false);
  const [payoutRegionalEmphasis, setPayoutRegionalEmphasis] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarUrlDraft, setAvatarUrlDraft] = useState("");
  const [avatarUrlBusy, setAvatarUrlBusy] = useState(false);
  const [settingsTab, setSettingsTab] = useState("account");
  const [refDash, setRefDash] = useState<{
    pending: number;
    active: number;
    tier: number;
    tierPercentLabel: string;
    creditsEarned: number;
  } | null>(null);
  const { startCheckout, busy: checkoutBusy } = useMorraCheckout();
  const [portalBusy, setPortalBusy] = useState(false);
  const [extArtistName, setExtArtistName] = useState("");
  const [extGenres, setExtGenres] = useState("");
  const [extInspirations, setExtInspirations] = useState("");
  const [extGoals, setExtGoals] = useState("");
  const [extBusy, setExtBusy] = useState(false);

  useEffect(() => {
    if (me?.user) {
      setUsername(me.user.username);
      setDisplayName(me.user.displayName);
    }
  }, [me]);

  useEffect(() => {
    if (!me?.user?.id) return;
    void (async () => {
      try {
        const r = await fetch("/api/user-profiles-extended", { credentials: "include" });
        const j = (await r.json()) as {
          extended?: {
            artist_name?: string | null;
            genres?: string[] | null;
            inspirations?: string | null;
            goals?: string | null;
          } | null;
        };
        if (!r.ok || !j.extended) return;
        setExtArtistName(j.extended.artist_name ?? "");
        setExtGenres((j.extended.genres ?? []).join(", "));
        setExtInspirations(j.extended.inspirations ?? "");
        setExtGoals(j.extended.goals ?? "");
      } catch {
        /* table may not exist yet */
      }
    })();
  }, [me?.user?.id]);

  async function saveAiContext() {
    setExtBusy(true);
    try {
      const genres = extGenres
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 30);
      const r = await fetch("/api/user-profiles-extended", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artist_name: extArtistName.trim() || null,
          genres,
          inspirations: extInspirations.trim() || null,
          goals: extGoals.trim() || null,
        }),
      });
      const j = (await r.json()) as { ok?: boolean; error?: string };
      if (!r.ok) {
        toast.error(j.error || "Could not save AI context");
        return;
      }
      toast.success("AI personalization saved");
    } catch {
      toast.error("Network error");
    } finally {
      setExtBusy(false);
    }
  }

  async function openBillingPortal() {
    if (portalBusy) return;
    setPortalBusy(true);
    try {
      const r = await fetch("/api/stripe/portal", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
      const j = (await r.json()) as { url?: string; error?: string };
      if (!r.ok) {
        toast.error(j.error || "Could not open billing portal");
        return;
      }
      if (j.url) window.location.href = j.url;
    } catch {
      toast.error("Network error");
    } finally {
      setPortalBusy(false);
    }
  }

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(null);
      return;
    }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const t = params.get("tab");
    if (
      t === "account" ||
      t === "subscription" ||
      t === "credits" ||
      t === "referrals" ||
      t === "earnings" ||
      t === "security"
    ) {
      setSettingsTab(t);
    }
    const c = params.get("checkout");
    if (!c) return;
    if (c === "success") {
      toast.success("Checkout complete");
      void refresh();
    } else if (c === "canceled") {
      toast.message("Checkout canceled");
    }
    window.history.replaceState({}, "", "/app/settings");
  }, [refresh]);

  useEffect(() => {
    if (settingsTab !== "referrals") return;
    void (async () => {
      try {
        const r = await fetch("/api/dashboard", { credentials: "include" });
        const j = (await r.json()) as {
          referrals?: {
            pending: number;
            active: number;
            tier: number;
            tierPercentLabel: string;
            creditsEarned: number;
          };
        };
        if (r.ok && j.referrals) setRefDash(j.referrals);
      } catch {
        setRefDash(null);
      }
    })();
  }, [settingsTab]);

  const userXP = me?.xp?.xp ?? 0;
  const levelProgress = getLevelProgress(userXP);
  const currentPlan = me?.user?.plan ?? "free";
  const creditsRemaining = me?.credits?.balance ?? 0;
  const subscriptionStatus = me?.user?.subscriptionStatus;
  const periodEndRaw = me?.user?.subscriptionCurrentPeriodEnd;

  const monthlyCreditsAllowance =
    monthlySubscriptionCreditsForUserPlan(currentPlan);

  const monthlyPriceUsd =
    isPlanKey(currentPlan) ? PLANS[currentPlan].price : 0;

  function formatPeriodEnd(iso: string | null | undefined) {
    if (!iso) return ",";
    try {
      return new Date(iso).toLocaleDateString(undefined, { dateStyle: "long" });
    } catch {
      return ",";
    }
  }

  const progressDenominator =
    monthlyCreditsAllowance ?? Math.max(creditsRemaining, 1);
  const creditsProgressPct = Math.min(
    100,
    (creditsRemaining / progressDenominator) * 100
  );

  const availableCents = me?.earnings?.availableCents ?? 0;
  const minPayoutCents = me?.minPayoutCents ?? 500;
  const pendingCents = me?.earnings?.pendingCents ?? 0;
  const stripeConnected = Boolean(me?.user?.stripeConnectAccountId);
  const userFlagged = me?.user?.flagged ?? false;

  function formatUsd(cents: number) {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  }

  async function connectStripe() {
    setEarnBusy(true);
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
      if (j2.url) {
        window.location.href = j2.url;
      }
    } finally {
      setEarnBusy(false);
    }
  }

  async function withdrawEarnings() {
    setEarnBusy(true);
    try {
      const r = await fetch("/api/stripe/payout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) {
        const msg = j.error || "Withdrawal failed";
        if (stripeErrorSuggestsRegionalLimit(msg)) setPayoutRegionalEmphasis(true);
        toast.error(msg);
        return;
      }
      setPayoutRegionalEmphasis(false);
      toast.success("Funds sent to your connected account.");
      await refresh();
    } finally {
      setEarnBusy(false);
    }
  }

  async function saveAccount() {
    setBusy(true);
    try {
      if (username.trim().toLowerCase() !== me?.user?.username) {
        const r = await fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ action: "username", username: username.trim().toLowerCase() }),
        });
        const j = (await r.json()) as { error?: string };
        if (!r.ok) {
          toast.error(j.error || "Could not update username");
          return;
        }
      }
      if (displayName.trim() !== me?.user?.displayName) {
        const r = await fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ action: "display_name", displayName: displayName.trim() }),
        });
        const j = (await r.json()) as { error?: string };
        if (!r.ok) {
          toast.error(j.error || "Could not update display name");
          return;
        }
      }
      toast.success("Saved");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function savePin() {
    if (newPin !== confirmPin) {
      toast.error("New PINs do not match");
      return;
    }
    if (newPin.length !== 6) {
      toast.error("PIN must be 6 digits");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "pin", currentPin, newPin }),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) {
        toast.error(j.error || "Could not update PIN");
        return;
      }
      toast.success("PIN updated");
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
    } finally {
      setBusy(false);
    }
  }

  async function uploadAvatar() {
    if (!avatarFile) return;
    setAvatarBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", avatarFile);
      const r = await fetch("/api/users/avatar", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const j = (await r.json()) as { success?: boolean; avatarUrl?: string; error?: string };
      if (!r.ok) {
        toast.error(j.error || "Upload failed");
        return;
      }
      toast.success("Profile picture updated");
      setAvatarFile(null);
      await refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setAvatarBusy(false);
    }
  }

  async function removeAvatar() {
    setAvatarBusy(true);
    try {
      const r = await fetch("/api/users/avatar", {
        method: "DELETE",
        credentials: "include",
      });
      const j = (await r.json()) as { success?: boolean; error?: string };
      if (!r.ok) {
        toast.error(j.error || "Could not remove avatar");
        return;
      }
      toast.success("Profile picture removed");
      setAvatarFile(null);
      setAvatarUrlDraft("");
      await refresh();
    } finally {
      setAvatarBusy(false);
    }
  }

  async function saveAvatarFromUrl() {
    const raw = avatarUrlDraft.trim();
    if (!raw) {
      toast.error("Paste an image URL or clear the field and use Remove.");
      return;
    }
    setAvatarUrlBusy(true);
    try {
      const r = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "avatar_url", avatarUrl: raw }),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) {
        toast.error(j.error || "Could not save URL");
        return;
      }
      toast.success("Profile picture URL saved");
      await refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setAvatarUrlBusy(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header with Level Badge */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-3">
            <span className="text-[#00FF94]">Account Settings</span>
          </h1>
          <p className="text-xl text-[#A0A0A0]">
            Manage your account and preferences
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-[#A0A0A0] mb-1">Your Level</p>
            <p className="text-lg font-bold text-[#00FF94]">{currentTitle}</p>
          </div>
          <LevelBadge level={levelProgress.currentLevel} size="lg" showGlow />
        </div>
      </div>

      <Tabs value={settingsTab} onValueChange={setSettingsTab} className="space-y-6">
        <TabsList className="bg-[#121212] border border-[#00FF94]/20 flex-wrap">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="credits">Credits</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="earnings">Earnings</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#121212] border border-[#00FF94]/20">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <User className="text-[#00FF94]" size={20} />
              Account Information
            </h2>
            
            <div className="space-y-6">
              {/* Profile Display */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-[#00FF94]/10 to-[#121212] border border-[#00FF94]/20">
                <div className="flex items-center gap-4">
                  {avatarPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarPreview}
                      alt=""
                      className="w-16 h-16 rounded-full object-cover border border-[#00FF94]/30"
                    />
                  ) : me?.user?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={me.user.avatarUrl}
                      alt=""
                      className="w-16 h-16 rounded-full object-cover border border-[#00FF94]/30"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#00FF94] to-[#9BFF00] flex items-center justify-center text-2xl font-bold text-[#0A0A0A]">
                      {displayName.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xl font-bold">{displayName}</p>
                      <LevelBadge level={levelProgress.currentLevel} size="sm" />
                    </div>
                    <p className="text-[#A0A0A0]">@{displayUsername(username)}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Award className="text-[#00FF94]" size={14} />
                      <p className="text-sm text-[#00FF94]">{currentTitle}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#00FF94]/10">
                <p className="font-semibold mb-2">Upload Profile Picture</p>
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <Input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
                    className="bg-[#121212] border-[#00FF94]/20 focus:border-[#00FF94]"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      disabled={avatarBusy || !avatarFile}
                      onClick={() => void uploadAvatar()}
                      className="bg-[#00FF94] text-[#0A0A0A] hover:bg-[#00FF94]/90"
                    >
                      {avatarBusy ? "Uploading…" : "Upload"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={avatarBusy || (!me?.user?.avatarUrl && !avatarPreview)}
                      onClick={() => void removeAvatar()}
                      className="border-[#00FF94]/30 text-[#00FF94] hover:bg-[#00FF94]/10"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-[#A0A0A0] mt-2">JPG/PNG/WEBP, up to 2MB.</p>
                <div className="mt-4 space-y-2">
                  <p className="font-semibold text-sm">Or set image URL</p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      placeholder="https://…"
                      value={avatarUrlDraft}
                      onChange={(e) => setAvatarUrlDraft(e.target.value)}
                      className="bg-[#121212] border-[#00FF94]/20"
                    />
                    <Button
                      type="button"
                      disabled={avatarUrlBusy || avatarBusy}
                      onClick={() => void saveAvatarFromUrl()}
                      className="border border-[#00FF94]/30 text-[#00FF94] hover:bg-[#00FF94]/10"
                      variant="outline"
                    >
                      {avatarUrlBusy ? "Saving…" : "Save URL"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Edit Fields */}
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-2 bg-[#0A0A0A] border-[#00FF94]/20 focus:border-[#00FF94]"
                />
                <p className="text-xs text-[#A0A0A0] mt-1">Used for login and referral links</p>
              </div>

              <div>
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="mt-2 bg-[#0A0A0A] border-[#00FF94]/20 focus:border-[#00FF94]"
                />
                <p className="text-xs text-[#A0A0A0] mt-1">How your name appears on the platform</p>
              </div>

              <div>
                <Label htmlFor="title">Active Title</Label>
                <select
                  id="title"
                  value={currentTitle}
                  onChange={(e) => setCurrentTitle(e.target.value)}
                  className="mt-2 w-full px-3 py-2 rounded-lg bg-[#0A0A0A] border border-[#00FF94]/20 focus:border-[#00FF94] text-white"
                >
                  <option>No Title</option>
                  <option>Rising Artist</option>
                  <option>Rookie Artist</option>
                </select>
                <p className="text-xs text-[#A0A0A0] mt-1">Unlocked titles from leveling up</p>
              </div>

              <Button
                type="button"
                disabled={busy}
                onClick={() => void saveAccount()}
                className="bg-[#00FF94] text-[#0A0A0A] hover:bg-[#00FF94]/90"
              >
                {busy ? "Saving…" : "Save Changes"}
              </Button>

              <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#00FF94]/15 mt-8">
                <h3 className="font-bold mb-1 flex items-center gap-2">
                  <Sparkles className="text-[#00FF94]" size={18} />
                  AI personalization
                </h3>
                <p className="text-xs text-[#A0A0A0] mb-4">
                  MORRA tools use this alongside your profile and recent work, helping avoid generic outputs.
                </p>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="ext-artist">Artist name (as you want AI to refer to you)</Label>
                    <Input
                      id="ext-artist"
                      value={extArtistName}
                      onChange={(e) => setExtArtistName(e.target.value)}
                      className="mt-1 bg-[#121212] border-[#00FF94]/20"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ext-genres">Genres (comma-separated)</Label>
                    <Input
                      id="ext-genres"
                      value={extGenres}
                      onChange={(e) => setExtGenres(e.target.value)}
                      placeholder="e.g. drill, R&B, indie rock"
                      className="mt-1 bg-[#121212] border-[#00FF94]/20"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ext-insp">Inspirations</Label>
                    <Textarea
                      id="ext-insp"
                      value={extInspirations}
                      onChange={(e) => setExtInspirations(e.target.value)}
                      className="mt-1 bg-[#121212] border-[#00FF94]/20 min-h-[72px]"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ext-goals">Goals (releases, tours, audience)</Label>
                    <Textarea
                      id="ext-goals"
                      value={extGoals}
                      onChange={(e) => setExtGoals(e.target.value)}
                      className="mt-1 bg-[#121212] border-[#00FF94]/20 min-h-[72px]"
                    />
                  </div>
                  <Button
                    type="button"
                    disabled={extBusy}
                    onClick={() => void saveAiContext()}
                    variant="outline"
                    className="border-[#00FF94]/40 text-[#00FF94]"
                  >
                    {extBusy ? "Saving…" : "Save AI context"}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* XP Progress */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-[#00FF94]/10 to-[#121212] border border-[#00FF94]/30">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="text-[#00FF94]" size={20} />
              Your Progress
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[#A0A0A0]">Current Level</span>
                <span className="text-xl font-bold text-[#00FF94]">Level {levelProgress.currentLevel}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#A0A0A0]">Total XP Earned</span>
                <span className="text-xl font-bold text-[#00FF94]">{userXP.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#A0A0A0]">XP to Next Level</span>
                <span className="text-xl font-bold">{levelProgress.xpToNextLevel.toLocaleString()}</span>
              </div>
              <Progress value={levelProgress.progressPercent} className="h-3" />
            </div>
          </div>
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#121212] border border-[#00FF94]/20">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <CreditCard className="text-[#00FF94]" size={20} />
              Subscription Management
            </h2>

            <div className="space-y-6">
              <div className="p-6 rounded-xl bg-gradient-to-br from-[#00FF94]/10 to-[#121212] border border-[#00FF94]/30">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-[#A0A0A0] mb-1">Current Plan</p>
                    <p className="text-3xl font-bold text-[#00FF94] capitalize">
                      {currentPlan}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-[#A0A0A0] mb-1">Monthly Cost</p>
                    <p className="text-2xl font-bold">
                      {currentPlan === "free" ? "$0" : `$${monthlyPriceUsd}.00`}
                    </p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  {currentPlan === "free" ? (
                    <>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="text-[#00FF94]" size={16} />
                        <span>1 AI generation per rolling 24 hours (server enforced)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="text-[#00FF94]" size={16} />
                        <span>Upgrade for monthly credit packs</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="text-[#00FF94]" size={16} />
                        <span>
                          {monthlyCreditsAllowance} credits added each billing cycle
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="text-[#00FF94]" size={16} />
                        <span>All AI tools included</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {(currentPlan !== "free" || subscriptionStatus === "active") && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={portalBusy}
                  onClick={() => void openBillingPortal()}
                  className="w-full border-[#00FF94]/50 text-[#00FF94] hover:bg-[#00FF94]/10"
                >
                  {portalBusy ? "Opening…" : "Manage subscription"}
                </Button>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#00FF94]/10">
                  <p className="text-sm text-[#A0A0A0] mb-1">Current period ends</p>
                  <p className="font-bold">{formatPeriodEnd(periodEndRaw)}</p>
                </div>
                <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#00FF94]/10">
                  <p className="text-sm text-[#A0A0A0] mb-1">Stripe status</p>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="text-[#00FF94]" size={16} />
                    <p className="font-bold text-[#00FF94]">
                      {subscriptionStatus ?? (currentPlan === "free" ? "," : "syncing")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {currentPlan === "free" && (
                  <>
                    <Button
                      type="button"
                      disabled={checkoutBusy}
                      onClick={() =>
                        void startCheckout({ type: "subscription", plan: "starter" })
                      }
                      className="flex-1 bg-[#00FF94] text-[#0A0A0A] hover:bg-[#00FF94]/90"
                    >
                      Starter, ${PLANS.starter.price}/mo
                    </Button>
                    <Button
                      type="button"
                      disabled={checkoutBusy}
                      onClick={() =>
                        void startCheckout({ type: "subscription", plan: "pro" })
                      }
                      className="flex-1 bg-[#00FF94] text-[#0A0A0A] hover:bg-[#00FF94]/90"
                    >
                      Pro, ${PLANS.pro.price}/mo
                    </Button>
                    <Button
                      type="button"
                      disabled={checkoutBusy}
                      onClick={() =>
                        void startCheckout({ type: "subscription", plan: "elite" })
                      }
                      className="flex-1 bg-[#00FF94] text-[#0A0A0A] hover:bg-[#00FF94]/90"
                    >
                      Elite, ${PLANS.elite.price}/mo
                    </Button>
                  </>
                )}
                {currentPlan === "starter" && (
                  <>
                    <Button
                      type="button"
                      disabled={checkoutBusy}
                      onClick={() =>
                        void startCheckout({ type: "subscription", plan: "pro" })
                      }
                      className="flex-1 bg-[#00FF94] text-[#0A0A0A] hover:bg-[#00FF94]/90"
                    >
                      Upgrade to Pro
                    </Button>
                    <Button
                      type="button"
                      disabled={checkoutBusy}
                      onClick={() =>
                        void startCheckout({ type: "subscription", plan: "elite" })
                      }
                      className="flex-1 bg-[#00FF94] text-[#0A0A0A] hover:bg-[#00FF94]/90"
                    >
                      Upgrade to Elite
                    </Button>
                  </>
                )}
                {currentPlan === "pro" && (
                  <Button
                    type="button"
                    disabled={checkoutBusy}
                    onClick={() =>
                      void startCheckout({ type: "subscription", plan: "elite" })
                    }
                    className="flex-1 bg-[#00FF94] text-[#0A0A0A] hover:bg-[#00FF94]/90"
                  >
                    Upgrade to Elite
                  </Button>
                )}
                {currentPlan === "elite" && (
                  <p className="text-sm text-[#A0A0A0] w-full text-center py-2">
                    You are on the Elite plan.
                  </p>
                )}
              </div>

              <p className="text-xs text-[#A0A0A0]">
                Billing is processed by Stripe. Secret keys never leave the server.
              </p>
            </div>
          </div>
        </TabsContent>

        {/* Credits Tab */}
        <TabsContent value="credits" className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#121212] border border-[#00FF94]/20">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Sparkles className="text-[#00FF94]" size={20} />
              Credits Management
            </h2>
            
            <div className="space-y-6">
              {/* Current Balance */}
              <div className="p-6 rounded-xl bg-gradient-to-br from-[#00FF94]/10 to-[#121212] border border-[#00FF94]/30">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-[#A0A0A0] mb-1">Credits Remaining</p>
                    <p className="text-4xl font-bold text-[#00FF94]">{creditsRemaining}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-[#A0A0A0] mb-1">
                      {monthlyCreditsAllowance != null
                        ? "Monthly pack (plan)"
                        : "Free tier"}
                    </p>
                    <p className="text-2xl font-bold">
                      {monthlyCreditsAllowance != null
                        ? monthlyCreditsAllowance
                        : "1 gen / 24h"}
                    </p>
                  </div>
                </div>
                <Progress value={creditsProgressPct} className="h-3 mb-2" />
                <p className="text-xs text-[#A0A0A0]">
                  {monthlyCreditsAllowance != null
                    ? `Credits refresh on paid invoices (see Subscription). Period ends ${formatPeriodEnd(periodEndRaw)}.`
                    : "Free accounts get one generation per rolling 24 hours without spending credits."}
                </p>
              </div>

              {/* Usage Breakdown */}
              <div>
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <History className="text-[#00FF94]" size={18} />
                  This Month&apos;s Usage
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#00FF94]/10">
                    <p className="text-xs text-[#A0A0A0] mb-1">Bio Generations</p>
                    <p className="text-2xl font-bold text-[#00FF94]">0</p>
                    <p className="text-xs text-[#A0A0A0] mt-1">10 credits each</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#00FF94]/10">
                    <p className="text-xs text-[#A0A0A0] mb-1">Lyric Analyses</p>
                    <p className="text-2xl font-bold text-[#00FF94]">0</p>
                    <p className="text-xs text-[#A0A0A0] mt-1">10-25 credits</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#00FF94]/10">
                    <p className="text-xs text-[#A0A0A0] mb-1">Cover Concepts</p>
                    <p className="text-2xl font-bold text-[#00FF94]">0</p>
                    <p className="text-xs text-[#A0A0A0] mt-1">15 credits each</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#00FF94]/10">
                    <p className="text-xs text-[#A0A0A0] mb-1">Release Plans</p>
                    <p className="text-2xl font-bold text-[#00FF94]">0</p>
                    <p className="text-xs text-[#A0A0A0] mt-1">20 credits each</p>
                  </div>
                </div>
              </div>

              {/* Credit packs (Stripe Checkout) */}
              <div className="p-6 rounded-xl bg-gradient-to-r from-[#00FF94]/10 to-[#9BFF00]/10 border border-[#00FF94]/30">
                <h3 className="font-bold mb-3">Buy credit packs</h3>
                <p className="text-sm text-[#A0A0A0] mb-4">
                  One-time packs match Stripe prices. Or subscribe on the Subscription tab for monthly credits.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {CREDIT_PACK_KEYS.map((key) => {
                    const p = CREDIT_PACKS[key];
                    return (
                      <Button
                        key={key}
                        type="button"
                        disabled={checkoutBusy}
                        variant="outline"
                        className="h-auto py-3 flex-col border-[#00FF94]/30 text-[#00FF94] hover:bg-[#00FF94]/10"
                        onClick={() =>
                          void startCheckout({ type: "credits", pack: key as CreditPackKey })
                        }
                      >
                        <span className="font-bold text-sm">{p.name}</span>
                        <span className="text-xs text-[#A0A0A0]">
                          {p.credits} cr · ${p.price}
                        </span>
                      </Button>
                    );
                  })}
                </div>
                <div className="flex gap-3">
                  <Link href="/app/referrals" className="flex-1">
                    <Button
                      variant="outline"
                      className="w-full border-[#00FF94]/30 text-[#00FF94] hover:bg-[#00FF94]/10"
                    >
                      <Gift className="mr-2" size={16} />
                      Earn via referrals
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Referrals Tab */}
        <TabsContent value="referrals" className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#121212] border border-[#00FF94]/20">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Gift className="text-[#00FF94]" size={20} />
              Referral Summary
            </h2>
            
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-[#00FF94]/10 to-[#121212] border border-[#00FF94]/30">
                  <p className="text-sm text-[#A0A0A0] mb-1">Current Tier</p>
                  <p className="text-2xl font-bold text-[#00FF94]">
                    {refDash ? `Tier ${refDash.tier}` : ","}
                  </p>
                  <p className="text-xs text-[#A0A0A0] mt-1">
                    {refDash ? `${refDash.tierPercentLabel} subscription revenue share` : "Loading…"}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#00FF94]/10">
                  <p className="text-sm text-[#A0A0A0] mb-1">Referrals</p>
                  <p className="text-2xl font-bold text-[#00FF94]">
                    {refDash != null ? refDash.pending + refDash.active : ","}
                  </p>
                  <p className="text-xs text-[#A0A0A0] mt-1">
                    {refDash != null
                      ? `${refDash.active} active · ${refDash.pending} pending`
                      : "Loading…"}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#00FF94]/10">
                  <p className="text-sm text-[#A0A0A0] mb-1">Credits Earned</p>
                  <p className="text-2xl font-bold text-[#00FF94]">
                    {refDash != null ? refDash.creditsEarned : ","}
                  </p>
                  <p className="text-xs text-[#A0A0A0] mt-1">From referral rewards</p>
                </div>
              </div>

              {/* View Full Referrals Page */}
              <Link href="/app/referrals">
                <div className="p-6 rounded-xl bg-gradient-to-r from-[#00FF94]/5 to-[#9BFF00]/5 border border-[#00FF94]/20 hover:border-[#00FF94]/40 transition-all group cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold mb-2">View Full Referral Dashboard</h3>
                      <p className="text-sm text-[#A0A0A0]">
                        See detailed stats, share your link, and track earnings
                      </p>
                    </div>
                    <ArrowRight className="text-[#00FF94] group-hover:translate-x-2 transition-transform" size={24} />
                  </div>
                </div>
              </Link>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#00FF94]/10">
            <p className="text-sm text-[#A0A0A0] mb-2">
              Referral revenue share and withdrawals are on the{" "}
              <button
                type="button"
                className="text-[#00FF94] underline"
                onClick={() => setSettingsTab("earnings")}
              >
                Earnings
              </button>{" "}
              tab.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="earnings" className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#121212] border border-[#00FF94]/20">
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
              <DollarSign className="text-[#00FF94]" size={20} />
              Referral earnings & payouts
            </h2>
            <p className="text-sm text-[#A0A0A0] mb-6">
              When invited users pay for a subscription, you may earn a percentage (tier 1–4). New earnings
              start as pending for about 10 days, then become available to withdraw in USD via Stripe.
              Payouts are processed by Stripe and may be delayed.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-gradient-to-br from-[#00FF94]/10 to-[#121212] border border-[#00FF94]/30">
                <p className="text-sm text-[#A0A0A0] mb-1">Available to withdraw</p>
                <p className="text-3xl font-bold text-[#00FF94]">{formatUsd(availableCents)}</p>
              </div>
              <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#00FF94]/10">
                <p className="text-sm text-[#A0A0A0] mb-1">Pending (~10-day hold)</p>
                <p className="text-3xl font-bold text-[#E0E0E0]">{formatUsd(pendingCents)}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#00FF94]/10 mb-6">
              <p className="text-sm text-[#A0A0A0] mb-1">Stripe Connect</p>
              <p className="font-medium mb-2">
                {stripeConnected
                  ? "Account linked, complete onboarding in Stripe if prompted."
                  : "Connect a Stripe Express account to receive withdrawals."}
              </p>
              {!stripeConnected ? <StripeOnboardingRegionNote className="mb-3" /> : null}
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  disabled={earnBusy || userFlagged}
                  onClick={() => void connectStripe()}
                  className="bg-[#00FF94] text-[#0A0A0A] hover:bg-[#00FF94]/90"
                >
                  {stripeConnected ? "Update bank details" : "Connect Stripe"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={
                    earnBusy ||
                    userFlagged ||
                    availableCents < minPayoutCents ||
                    !stripeConnected
                  }
                  onClick={() => void withdrawEarnings()}
                  className="border-[#00FF94]/30 text-[#00FF94]"
                >
                  Withdraw earnings
                </Button>
              </div>
              <StripePayoutWithdrawClarifications
                className="mt-4"
                emphasizeRegionalLimit={payoutRegionalEmphasis}
              />
              {userFlagged && (
                <p className="text-xs text-[#FF6B00] mt-3">
                  Payouts are temporarily unavailable for this account.
                </p>
              )}
              <p className="text-xs text-[#A0A0A0] mt-3">
                Minimum withdrawal {formatUsd(minPayoutCents)}. Stripe handles identity verification; MORRA
                does not store bank details.
              </p>
            </div>

            <Link href="/app/payouts">
              <div className="p-4 rounded-xl bg-gradient-to-r from-[#00FF94]/5 to-[#9BFF00]/5 border border-[#00FF94]/20 hover:border-[#00FF94]/40 transition-all flex items-center justify-between">
                <div>
                  <h3 className="font-bold">Payout history</h3>
                  <p className="text-sm text-[#A0A0A0]">View the payouts page for more detail</p>
                </div>
                <ArrowRight className="text-[#00FF94]" size={20} />
              </div>
            </Link>
          </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#121212] border border-[#00FF94]/20">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Shield className="text-[#00FF94]" size={20} />
              Security Settings
            </h2>
            
            <div className="space-y-6">
              {/* Change PIN */}
              <div>
                <h3 className="font-bold mb-4">Change 6-Digit PIN</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="currentPin">Current PIN</Label>
                    <Input
                      id="currentPin"
                      type="password"
                      placeholder="Enter current PIN"
                      maxLength={6}
                      value={currentPin}
                      onChange={(e) =>
                        setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      className="mt-2 bg-[#0A0A0A] border-[#00FF94]/20 focus:border-[#00FF94]"
                    />
                  </div>
                  <div>
                    <Label htmlFor="newPin">New PIN</Label>
                    <Input
                      id="newPin"
                      type="password"
                      placeholder="Enter new 6-digit PIN"
                      maxLength={6}
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="mt-2 bg-[#0A0A0A] border-[#00FF94]/20 focus:border-[#00FF94]"
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirmPin">Confirm New PIN</Label>
                    <Input
                      id="confirmPin"
                      type="password"
                      placeholder="Confirm new PIN"
                      maxLength={6}
                      value={confirmPin}
                      onChange={(e) =>
                        setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      className="mt-2 bg-[#0A0A0A] border-[#00FF94]/20 focus:border-[#00FF94]"
                    />
                  </div>
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={() => void savePin()}
                    className="bg-[#00FF94] text-[#0A0A0A] hover:bg-[#00FF94]/90"
                  >
                    Update PIN
                  </Button>
                </div>
              </div>

              {/* Security Notice */}
              <div className="p-4 rounded-xl bg-[#FF6B00]/10 border border-[#FF6B00]/30">
                <p className="font-bold text-[#FF6B00] mb-1">Important Security Notice</p>
                <p className="text-sm text-[#A0A0A0]">
                  MORRA uses username + PIN authentication for maximum privacy. Keep your PIN secure and don&apos;t share it with anyone. 
                  Store it in a secure password manager. Since we don&apos;t use email for recovery, keeping your PIN safe is crucial.
                </p>
              </div>

              {/* Account Security Info */}
              <div className="space-y-3">
                <h3 className="font-bold">Your Security</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="text-[#00FF94]" size={16} />
                    <span>No email required for privacy</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="text-[#00FF94]" size={16} />
                    <span>6-digit PIN encryption</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="text-[#00FF94]" size={16} />
                    <span>Account data fully encrypted</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="text-[#00FF94]" size={16} />
                    <span>No personal data sold to third parties</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Assistant Settings */}
          <div className="p-6 rounded-2xl bg-[#121212] border border-[#00FF94]/20">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Sparkles className="text-[#00FF94]" size={20} />
              MORRA Assistant Settings
            </h2>
            
            <div className="space-y-6">
              {/* Chat History */}
              <div>
                <h3 className="font-bold mb-3">Chat History</h3>
                <p className="text-sm text-[#A0A0A0] mb-4">
                  Your conversations with the MORRA Assistant are stored locally on your device only. We don&apos;t track or store chat history on our servers.
                </p>
                <Button 
                  variant="outline" 
                  className="border-[#00FF94]/30 text-[#00FF94] hover:bg-[#00FF94]/10"
                  onClick={() => {
                    localStorage.removeItem('morra-assistant-history');
                    alert('Chat history cleared successfully!');
                  }}
                >
                  Clear Local Chat History
                </Button>
              </div>

              {/* Privacy Info */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-[#00FF94]/5 to-[#9BFF00]/5 border border-[#00FF94]/20">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="text-[#00FF94] flex-shrink-0 mt-0.5" size={18} />
                  <div>
                    <p className="font-bold mb-2">Privacy First</p>
                    <ul className="text-sm text-[#A0A0A0] space-y-1">
                      <li>• Chats stored locally on your device</li>
                      <li>• No personal data required</li>
                      <li>• No tracking or analytics</li>
                      <li>• Instant FAQ responses when possible</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Accuracy Note */}
              <div className="p-4 rounded-xl bg-[#FF6B00]/10 border border-[#FF6B00]/30 flex gap-3">
                <AlertCircle className="text-[#FF6B00] flex-shrink-0" size={20} />
                <div>
                  <p className="font-bold text-[#FF6B00] mb-1">Accuracy Notice</p>
                  <p className="text-sm text-[#A0A0A0]">
                    The Assistant provides helpful information but may occasionally have limitations. 
                    Always verify critical information before making important decisions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}