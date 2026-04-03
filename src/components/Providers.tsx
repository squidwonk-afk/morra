"use client";

import { ThemeProvider } from "next-themes";
import { DeviceBootstrap } from "@/components/DeviceBootstrap";
import { Toaster } from "@/components/ui/sonner";
import { MorraUserProvider } from "@/contexts/MorraUserContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} forcedTheme="dark">
      <MorraUserProvider>
        <DeviceBootstrap />
        {children}
        <Toaster position="top-center" richColors />
      </MorraUserProvider>
    </ThemeProvider>
  );
}
