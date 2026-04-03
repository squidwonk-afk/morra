"use client";

import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navbar />
      <main className="pt-16">{children}</main>
      <Footer />
    </div>
  );
}
