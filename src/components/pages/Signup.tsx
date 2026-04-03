"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { MorraLogo } from "@/components/MorraLogo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield } from "lucide-react";

export function Signup() {
  const searchParams = useSearchParams();
  const refFromUrl = (searchParams.get("ref") || "").trim().toLowerCase();

  const [formData, setFormData] = useState({
    username: "",
    displayName: "",
    pin: "",
    confirmPin: "",
  });
  const [referralCode, setReferralCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);

  useEffect(() => {
    if (refFromUrl) {
      setReferralCode(refFromUrl);
    }
  }, [refFromUrl]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (formData.pin !== formData.confirmPin) {
      toast.error("PINs don't match");
      return;
    }
    if (formData.pin.length !== 6) {
      toast.error("PIN must be exactly 6 digits");
      return;
    }
    if (!agreedTerms) {
      toast.error("Please agree to the Terms and Privacy Policy");
      return;
    }
    setBusy(true);
    try {
      const codeRaw = referralCode.trim().toLowerCase();
      const payload: Record<string, string | boolean> = {
        username: formData.username.trim().toLowerCase(),
        displayName: formData.displayName.trim(),
        pin: formData.pin,
        termsAccepted: true,
      };
      if (codeRaw.length >= 4) {
        payload.referralCode = codeRaw;
      }

      const r = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const j = (await r.json()) as { ok?: boolean; error?: string };
      if (!r.ok) {
        toast.error(j.error || "Signup failed");
        return;
      }
      toast.success("Account created");
      window.location.assign("/app");
    } catch {
      toast.error("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex mb-6 mx-auto bg-transparent leading-none outline-offset-4 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#00FF94]/50"
          >
            <MorraLogo className="h-12 w-auto" />
          </Link>
          <h1 className="text-4xl font-bold mb-3">
            Start <span className="text-[#00FF94]">Creating</span>
          </h1>
          <p className="text-[#A0A0A0]">Join thousands of artists on MORRA</p>
        </div>

        <div className="p-8 rounded-2xl bg-[#121212] border border-[#00FF94]/20">
          <div className="mb-6 p-3 rounded-lg bg-[#00FF94]/10 border border-[#00FF94]/30 flex items-center gap-3">
            <Shield className="text-[#00FF94]" size={20} />
            <p className="text-sm text-[#00FF94]">No email. No tracking. Fully private.</p>
          </div>

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="artist_name"
                value={formData.username}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                  })
                }
                required
                minLength={3}
                autoComplete="username"
                className="mt-2 bg-[#0A0A0A] border-[#00FF94]/20 focus:border-[#00FF94]"
              />
              <p className="text-xs text-[#A0A0A0] mt-1">
                Lowercase letters, numbers, and underscores only
              </p>
            </div>

            <div>
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                placeholder="Artist Name"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                required
                className="mt-2 bg-[#0A0A0A] border-[#00FF94]/20 focus:border-[#00FF94]"
              />
            </div>

            <div>
              <Label htmlFor="referralCode" className="text-[#E0E0E0]">
                Referral Code <span className="text-[#707070] font-normal">(optional)</span>
              </Label>
              <Input
                id="referralCode"
                placeholder="e.g. from a friend's link"
                value={referralCode}
                onChange={(e) =>
                  setReferralCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))
                }
                maxLength={16}
                autoComplete="off"
                className="mt-2 bg-[#0A0A0A] border-[#00FF94]/20 focus:border-[#00FF94] font-mono text-sm"
              />
              <p className="text-xs text-[#707070] mt-1">
                Invalid or unknown codes are ignored, your signup still goes through.
              </p>
            </div>

            <div>
              <Label htmlFor="pin">Create 6-Digit PIN</Label>
              <Input
                id="pin"
                type="password"
                placeholder="Create 6-digit PIN"
                value={formData.pin}
                onChange={(e) =>
                  setFormData({ ...formData, pin: e.target.value.replace(/\D/g, "").slice(0, 6) })
                }
                required
                maxLength={6}
                inputMode="numeric"
                className="mt-2 bg-[#0A0A0A] border-[#00FF94]/20 focus:border-[#00FF94] text-2xl tracking-widest text-center"
              />
            </div>

            <div>
              <Label htmlFor="confirmPin">Confirm PIN</Label>
              <Input
                id="confirmPin"
                type="password"
                placeholder="Confirm your PIN"
                value={formData.confirmPin}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPin: e.target.value.replace(/\D/g, "").slice(0, 6) })
                }
                required
                maxLength={6}
                inputMode="numeric"
                className="mt-2 bg-[#0A0A0A] border-[#00FF94]/20 focus:border-[#00FF94] text-2xl tracking-widest text-center"
              />
            </div>

            <label
              htmlFor="terms"
              className="flex items-start gap-4 rounded-xl border border-[#00FF94]/25 bg-[#0A0A0A]/90 p-4 sm:p-5 cursor-pointer select-none hover:border-[#00FF94]/40 transition-colors"
            >
              <Checkbox
                id="terms"
                checked={agreedTerms}
                onCheckedChange={(v) => setAgreedTerms(v === true)}
                className="mt-0.5 h-6 w-6 min-h-6 min-w-6 rounded-md border-2 border-[#00FF94]/55 data-[state=checked]:bg-[#00FF94] data-[state=checked]:border-[#00FF94] data-[state=checked]:text-[#0A0A0A] [&_[data-slot=checkbox-indicator]_svg]:size-4"
              />
              <span className="text-sm sm:text-base text-[#E8E8E8] font-normal leading-relaxed">
                I have read and agree to the{" "}
                <Link
                  href="/terms"
                  className="text-[#00FF94] hover:underline font-semibold"
                  onClick={(e) => e.stopPropagation()}
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  className="text-[#00FF94] hover:underline font-semibold"
                  onClick={(e) => e.stopPropagation()}
                >
                  Privacy Policy
                </Link>
                .
              </span>
            </label>

            <Button
              type="submit"
              disabled={busy || !agreedTerms}
              className="w-full bg-[#00FF94] text-[#0A0A0A] hover:bg-[#00FF94]/90 shadow-[0_0_20px_rgba(0,255,148,0.3)] hover:shadow-[0_0_30px_rgba(0,255,148,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? "Creating…" : "Create Identity"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-[#A0A0A0]">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-[#00FF94] hover:text-[#9BFF00] transition-colors font-semibold"
              >
                Log In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
