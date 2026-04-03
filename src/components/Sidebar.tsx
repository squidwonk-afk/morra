"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  User,
  Calendar,
  Music,
  Image,
  Users,
  Settings,
  Gift,
  DollarSign,
  CreditCard,
  Zap,
} from "lucide-react";
import { LevelBadge } from "@/components/LevelBadge";
import { getLevelProgress } from "@/lib/gamification";
import { displayUsername } from "@/lib/profile/username";
import { useMorraUser } from "@/contexts/MorraUserContext";

const navItems: { path: string; icon: typeof LayoutDashboard; label: string; highlight?: boolean }[] = [
  { path: "/app", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/app/identity", icon: User, label: "Artist Identity" },
  { path: "/app/rollout", icon: Calendar, label: "Rollout Planner" },
  { path: "/app/lyrics", icon: Music, label: "Lyric Analyzer" },
  { path: "/app/cover", icon: Image, label: "Cover Studio" },
  { path: "/app/collab", icon: Users, label: "Collab Finder" },
  { path: "/app/referrals", icon: Gift, label: "Referrals", highlight: true },
  { path: "/app/payouts", icon: DollarSign, label: "Payouts" },
  { path: "/pricing#upgrade", icon: Zap, label: "Upgrade Plan", highlight: true },
  { path: "/pricing#credits", icon: CreditCard, label: "Buy Credits" },
  { path: "/app/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { me } = useMorraUser();
  const userXP = me?.xp?.xp ?? 0;
  const levelProgress = getLevelProgress(userXP);
  const displayName = me?.user?.displayName ?? "Artist";
  const username = displayUsername(me?.user?.username);
  const initial = displayName.charAt(0).toUpperCase() || "A";
  const avatarUrl = me?.user?.avatarUrl ?? null;
  const bal = me?.credits?.balance ?? 0;
  const isGod = me?.user?.isGod ?? false;
  const lowCredits = !isGod && typeof bal === "number" && bal > 0 && bal < 25;
  const outOfCredits = !isGod && typeof bal === "number" && bal <= 0;

  return (
    <aside className="w-64 border-r border-border/50 bg-[#0A0A0A] h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto flex flex-col">
      <Link
        href="/app/settings"
        className="p-4 border-b border-border/50 hover:bg-[#121212] transition-colors"
      >
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              className="w-12 h-12 rounded-full object-cover border border-[#00FF94]/30"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00FF94] to-[#9BFF00] flex items-center justify-center text-lg font-bold text-[#0A0A0A]">
              {initial}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-sm truncate">{displayName}</p>
              <LevelBadge level={levelProgress.currentLevel} size="sm" />
            </div>
            <p className="text-xs text-[#00FF94]/80 truncate font-medium">
              @{username}
            </p>
          </div>
        </div>
      </Link>

      {(lowCredits || outOfCredits) && (
        <div className="mx-3 mb-2 p-3 rounded-xl border border-[#FF6B00]/35 bg-[#FF6B00]/10 text-xs text-[#A0A0A0]">
          <p className="font-semibold text-[#FF6B00] mb-1">Out of credits?</p>
          <p>
            Grab a pack or upgrade your plan to keep creating without interruption.
          </p>
        </div>
      )}

      <nav className="p-4 space-y-2 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const basePath = item.path.split("#")[0] ?? item.path;
          const isActive =
            basePath === "/app"
              ? pathname === "/app"
              : pathname === basePath || pathname.startsWith(basePath + "/");

          return (
            <Link
              key={item.label + item.path}
              href={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                isActive
                  ? "bg-[#00FF94]/10 text-[#00FF94] shadow-[0_0_20px_rgba(0,255,148,0.2)]"
                  : "text-[#A0A0A0] hover:text-[#00FF94] hover:bg-[#121212]"
              }`}
            >
              <Icon
                size={20}
                className={`transition-all ${
                  isActive
                    ? "drop-shadow-[0_0_8px_rgba(0,255,148,0.6)]"
                    : "group-hover:drop-shadow-[0_0_8px_rgba(0,255,148,0.4)]"
                }`}
              />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
