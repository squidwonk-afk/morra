"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Bell, Menu, Trophy, X } from "lucide-react";
import { MorraLogo } from "@/components/ui/MorraLogo";
import { Button } from "@/components/ui/button";
import { useMorraUser } from "@/contexts/MorraUserContext";

type NotificationRow = {
  id: string;
  type: "subscription" | "referral" | "system" | "usage" | string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
};

export function Navbar({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const [songWarsNavVisible, setSongWarsNavVisible] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifBusy, setNotifBusy] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifs, setNotifs] = useState<NotificationRow[]>([]);
  const { me } = useMorraUser();
  const router = useRouter();
  const credits = me?.credits?.balance;
  const lowCredits = typeof credits === "number" && credits > 0 && credits < 20;
  const outOfCredits = typeof credits === "number" && credits <= 0;
  const initial =
    me?.user?.displayName?.charAt(0).toUpperCase() ||
    me?.user?.username?.charAt(0).toUpperCase() ||
    "A";

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.push("/");
    router.refresh();
  }

  async function loadNotifications() {
    if (!isLoggedIn) return;
    setNotifBusy(true);
    try {
      const r = await fetch("/api/notifications", { credentials: "include" });
      const j = (await r.json()) as {
        ok?: boolean;
        notifications?: NotificationRow[];
        unreadCount?: number;
        error?: string;
      };
      if (!r.ok) return;
      setNotifs(j.notifications ?? []);
      setUnreadCount(j.unreadCount ?? 0);
    } catch {
      // ignore
    } finally {
      setNotifBusy(false);
    }
  }

  async function markRead(ids: string[]) {
    if (!ids.length) return;
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ids }),
    });
    setNotifs((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - ids.length));
  }

  async function markAllRead() {
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ all: true }),
    });
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  const visibleNotifs = useMemo(() => notifs.slice(0, 12), [notifs]);

  useEffect(() => {
    if (!isLoggedIn) return;
    void loadNotifications();
    const t = setInterval(() => {
      void loadNotifications();
    }, 30_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/songwars/event", { credentials: "include", cache: "no-store" })
      .then(async (r) => {
        try {
          const j = (await r.json()) as {
            available?: boolean;
            comingSoon?: boolean;
            event?: unknown;
            noActiveEvent?: boolean;
          };
          if (cancelled) return;
          const ok =
            r.ok &&
            j.available !== false &&
            !j.comingSoon &&
            (Boolean(j.event) || Boolean(j.noActiveEvent));
          setSongWarsNavVisible(ok);
        } catch {
          if (!cancelled) setSongWarsNavVisible(false);
        }
      })
      .catch(() => {
        if (!cancelled) setSongWarsNavVisible(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-[#0A0A0A]/90 backdrop-blur-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {isLoggedIn && (lowCredits || outOfCredits) ? (
          <div className="py-2 text-xs sm:text-sm border-b border-[#00FF94]/15 bg-[#07130E]/40">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[#C9FFE8]">
                {outOfCredits ? (
                  <>
                    <span className="font-medium text-[#00FF94]">Out of credits.</span>{" "}
                    Buy credits or upgrade to keep generating.
                  </>
                ) : (
                  <>
                    <span className="font-medium text-[#00FF94]">You&apos;re low on credits.</span>{" "}
                    Top up to avoid interruptions.
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href="/pricing"
                  className="text-[#00FF94] hover:text-white transition-colors underline underline-offset-4"
                >
                  Buy credits
                </Link>
                <Link
                  href="/pricing"
                  className="text-[#A0A0A0] hover:text-white transition-colors"
                >
                  Upgrade
                </Link>
              </div>
            </div>
          </div>
        ) : null}
        <div className="flex items-center justify-between h-16">
          <Link
            href="/"
            className="flex items-center gap-3 bg-transparent leading-none rounded-sm outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#00FF94]/40"
          >
            <MorraLogo className="h-8 w-auto" />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {!isLoggedIn ? (
              <>
                {songWarsNavVisible ? (
                  <Link
                    href="/#song-wars"
                    className="inline-flex items-center gap-2 rounded-full border border-[#FF6B00]/40 bg-[#FF6B00]/10 px-3 py-1 text-sm font-semibold text-[#FFB86C] hover:bg-[#FF6B00]/20 hover:border-[#FF6B00]/60 transition-colors"
                  >
                    <Trophy className="h-4 w-4" />
                    Song Wars
                  </Link>
                ) : null}
                <Link
                  href="/app"
                  className="text-[#A0A0A0] hover:text-[#00FF94] transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/app"
                  className="text-[#A0A0A0] hover:text-[#00FF94] transition-colors"
                >
                  Tools
                </Link>
                <Link
                  href="/app/collab"
                  className="text-[#A0A0A0] hover:text-[#00FF94] transition-colors"
                >
                  Collab
                </Link>
                <Link
                  href="/pricing"
                  className="text-[#A0A0A0] hover:text-[#00FF94] transition-colors"
                >
                  Pricing
                </Link>
              </>
            ) : songWarsNavVisible ? (
              <Link
                href="/app/songwars"
                className="inline-flex items-center gap-2 rounded-full border border-[#FF6B00]/40 bg-[#FF6B00]/10 px-3 py-1 text-sm font-semibold text-[#FFB86C] hover:bg-[#FF6B00]/20 hover:border-[#FF6B00]/60 transition-colors"
              >
                <Trophy className="h-4 w-4" />
                Song Wars
              </Link>
            ) : null}
          </div>

          <div className="hidden md:flex items-center gap-4">
            {!isLoggedIn ? (
              <>
                <Link href="/login">
                  <Button
                    variant="ghost"
                    className="text-[#A0A0A0] hover:text-[#00FF94] hover:bg-transparent"
                  >
                    Login
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button className="bg-[#00FF94] text-[#0A0A0A] hover:bg-[#00FF94]/90 shadow-[0_0_20px_rgba(0,255,148,0.3)] hover:shadow-[0_0_30px_rgba(0,255,148,0.5)] transition-all">
                    Sign Up
                  </Button>
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setNotifOpen((v) => !v);
                      void loadNotifications();
                    }}
                    className="text-[#A0A0A0] hover:text-[#00FF94]"
                    aria-label="Notifications"
                  >
                    <Bell size={20} />
                  </Button>
                  {unreadCount > 0 ? (
                    <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-[#00FF94] text-[#0A0A0A] text-xs font-bold flex items-center justify-center shadow-[0_0_12px_rgba(0,255,148,0.6)]">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  ) : null}

                  {notifOpen ? (
                    <div className="absolute right-0 mt-2 w-[360px] max-w-[80vw] rounded-2xl bg-[#0A0A0A] border border-[#00FF94]/20 shadow-[0_0_40px_rgba(0,255,148,0.15)] overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-[#00FF94]/10">
                        <p className="font-semibold">Notifications</p>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            disabled={notifBusy || unreadCount === 0}
                            onClick={() => void markAllRead()}
                            className="text-xs text-[#A0A0A0] hover:text-[#00FF94]"
                          >
                            Mark all read
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setNotifOpen(false)}
                            className="text-[#A0A0A0] hover:text-[#00FF94]"
                          >
                            ✕
                          </Button>
                        </div>
                      </div>

                      <div className="max-h-[420px] overflow-y-auto">
                        {visibleNotifs.length === 0 ? (
                          <div className="px-4 py-6 text-sm text-[#A0A0A0]">
                            No notifications yet.
                          </div>
                        ) : (
                          visibleNotifs.map((n) => (
                            <button
                              key={n.id}
                              type="button"
                              onClick={() => void markRead(n.read ? [] : [n.id])}
                              className={`w-full text-left px-4 py-3 border-b border-[#00FF94]/10 hover:bg-[#121212] transition-colors ${
                                n.read ? "opacity-80" : ""
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <span
                                  className={`mt-1 w-2 h-2 rounded-full ${
                                    n.read ? "bg-transparent" : "bg-[#00FF94]"
                                  }`}
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold truncate">{n.title}</p>
                                  <p className="text-sm text-[#A0A0A0] mt-1 line-clamp-2">
                                    {n.message}
                                  </p>
                                  <p className="text-xs text-[#707070] mt-2">
                                    {new Date(n.createdAt).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="px-4 py-2 rounded-xl bg-[#121212] border border-[#00FF94]/30 shadow-[0_0_15px_rgba(0,255,148,0.2)] hover:shadow-[0_0_25px_rgba(0,255,148,0.3)] transition-all">
                  <span className="text-[#A0A0A0] text-sm">Credits: </span>
                  <span className="text-[#00FF94] font-bold drop-shadow-[0_0_8px_rgba(0,255,148,0.8)]">
                    {credits ?? 0}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00FF94] to-[#9BFF00] flex items-center justify-center">
                  <span className="text-[#0A0A0A] font-bold">{initial}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[#A0A0A0] hover:text-[#00FF94]"
                  type="button"
                  onClick={() => void logout()}
                >
                  Log out
                </Button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-[#00FF94] hover:text-[#9BFF00] transition-colors"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/50 bg-[#0A0A0A] backdrop-blur-lg">
          <div className="px-4 py-4 space-y-3">
            {songWarsNavVisible ? (
              <Link
                href={isLoggedIn ? "/app/songwars" : "/#song-wars"}
                className="flex items-center gap-2 rounded-xl border border-[#FF6B00]/35 bg-[#FF6B00]/10 px-3 py-3 text-[#FFB86C] font-semibold"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Trophy className="h-4 w-4 shrink-0" />
                Song Wars
              </Link>
            ) : null}
            <Link
              href="/app"
              className="block text-[#A0A0A0] hover:text-[#00FF94] transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Dashboard
            </Link>
            <Link
              href="/app/collab"
              className="block text-[#A0A0A0] hover:text-[#00FF94] transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Collab
            </Link>
            <Link
              href="/pricing"
              className="block text-[#A0A0A0] hover:text-[#00FF94] transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Pricing
            </Link>
            {isLoggedIn && (
              <Button
                variant="outline"
                className="w-full border-[#00FF94]/30"
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  void logout();
                }}
              >
                Log out
              </Button>
            )}
            {!isLoggedIn && (
              <div className="pt-4 space-y-2 border-t border-border/50">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full text-[#A0A0A0] hover:text-[#00FF94]">
                    Login
                  </Button>
                </Link>
                <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full bg-[#00FF94] text-[#0A0A0A] hover:bg-[#00FF94]/90">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
