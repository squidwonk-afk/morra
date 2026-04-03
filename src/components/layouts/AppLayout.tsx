"use client";

import { usePathname } from "next/navigation";
import { AssistantProvider, useAssistant } from "@/contexts/AssistantContext";
import { IdentityRequiredModal } from "@/components/auth/IdentityRequiredModal";
import { FloatingChatButton } from "@/components/FloatingChatButton";
import { MorraAssistant } from "@/components/MorraAssistant";
import { LowCreditBanner } from "@/components/conversion/LowCreditBanner";
import { GlobalMetricsHub } from "@/components/metrics/GlobalMetricsHub";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { useMorraUser } from "@/contexts/MorraUserContext";

function isSongWarsPublicPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname === "/app/songwars" ||
    pathname === "/app/songwars/leaderboard" ||
    pathname.startsWith("/app/songwars/")
  );
}

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const { isOpen, openAssistant, closeAssistant } = useAssistant();
  const pathname = usePathname();
  const { me, sessionResolved } = useMorraUser();
  const needsIdentity = sessionResolved && !me?.user && !isSongWarsPublicPath(pathname);

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <div className={needsIdentity ? "pointer-events-none select-none" : undefined} inert={needsIdentity}>
        <Navbar isLoggedIn={Boolean(me?.user)} />
        <div className="pt-16">
          <GlobalMetricsHub />
          <div className="flex">
            <Sidebar />
            <main className="flex-1 p-8">
              <LowCreditBanner />
              {children}
            </main>
          </div>
        </div>
        <FloatingChatButton onClick={openAssistant} />
        <MorraAssistant isOpen={isOpen} onClose={closeAssistant} />
      </div>
      <IdentityRequiredModal open={needsIdentity} />
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AssistantProvider>
      <AppLayoutContent>{children}</AppLayoutContent>
    </AssistantProvider>
  );
}
