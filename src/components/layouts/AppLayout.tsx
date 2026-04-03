"use client";

import { AssistantProvider, useAssistant } from "@/contexts/AssistantContext";
import { FloatingChatButton } from "@/components/FloatingChatButton";
import { MorraAssistant } from "@/components/MorraAssistant";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const { isOpen, openAssistant, closeAssistant } = useAssistant();

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navbar isLoggedIn />
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 p-8">{children}</main>
      </div>
      <FloatingChatButton onClick={openAssistant} />
      <MorraAssistant isOpen={isOpen} onClose={closeAssistant} />
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
