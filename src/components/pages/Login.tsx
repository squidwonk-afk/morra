"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { MorraLogo } from "@/components/MorraLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield } from "lucide-react";

function safeInternalPath(raw: string | null): string {
  const n = raw?.trim() || "/app";
  if (!n.startsWith("/") || n.startsWith("//") || n.includes("://")) return "/app";
  return n;
}

export function Login() {
  const searchParams = useSearchParams();
  const nextPath = safeInternalPath(searchParams.get("next"));
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: username.trim().toLowerCase(),
          pin,
        }),
      });
      const j = (await r.json()) as { ok?: boolean; error?: string };
      if (!r.ok) {
        toast.error(j.error || "Login failed");
        return;
      }
      toast.success("Welcome back");
      window.location.assign(nextPath);
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
            Welcome <span className="text-[#00FF94]">Back</span>
          </h1>
          <p className="text-[#A0A0A0]">Log in to your account</p>
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
                type="text"
                placeholder="your_username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="mt-2 bg-[#0A0A0A] border-[#00FF94]/20 focus:border-[#00FF94]"
              />
            </div>

            <div>
              <Label htmlFor="pin">6-Digit PIN</Label>
              <Input
                id="pin"
                type="password"
                placeholder="Enter your 6-digit PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                maxLength={6}
                inputMode="numeric"
                autoComplete="current-password"
                className="mt-2 bg-[#0A0A0A] border-[#00FF94]/20 focus:border-[#00FF94] text-2xl tracking-widest text-center"
              />
              <p className="text-xs text-[#A0A0A0] mt-1">Numbers only</p>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-[#A0A0A0]">PINs are not recoverable.</span>
              <Link href="/faq" className="text-[#00FF94] hover:text-[#9BFF00] transition-colors">
                Help
              </Link>
            </div>

            <Button
              type="submit"
              disabled={busy}
              className="w-full bg-[#00FF94] text-[#0A0A0A] hover:bg-[#00FF94]/90 shadow-[0_0_20px_rgba(0,255,148,0.3)] hover:shadow-[0_0_30px_rgba(0,255,148,0.5)] transition-all"
            >
              {busy ? "Signing in…" : "Log In"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-[#A0A0A0]">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="text-[#00FF94] hover:text-[#9BFF00] transition-colors font-semibold"
              >
                Sign Up
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-sm text-[#A0A0A0] mt-6">
          By logging in, you agree to our{" "}
          <Link href="/terms" className="text-[#00FF94] hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-[#00FF94] hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
