"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-9xl font-bold mb-4 bg-gradient-to-r from-[#00FF94] to-[#9BFF00] bg-clip-text text-transparent">
          404
        </h1>
        <h2 className="text-4xl font-bold mb-4">Page Not Found</h2>
        <p className="text-xl text-[#A0A0A0] mb-8">
          This page seems to have wandered off into the void
        </p>
        <Link href="/">
          <Button className="bg-[#00FF94] text-[#0A0A0A] hover:bg-[#00FF94]/90 shadow-[0_0_20px_rgba(0,255,148,0.3)]">
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
