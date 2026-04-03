"use client";

import Link from "next/link";
import { MorraLogo } from "@/components/MorraLogo";

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-[#0A0A0A] mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1">
            <div className="mb-4">
              <MorraLogo className="h-9 w-auto max-w-[180px]" />
            </div>
            <p className="text-[#A0A0A0] text-sm">Your Creative Intelligence Engine on morra.store</p>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Product</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/app" className="text-[#A0A0A0] hover:text-[#00FF94] text-sm transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <a
                  href="https://morra.store/pricing"
                  className="text-[#A0A0A0] hover:text-[#00FF94] text-sm transition-colors"
                >
                  Pricing
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Company</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://morra.store/team"
                  className="text-[#A0A0A0] hover:text-[#00FF94] text-sm transition-colors"
                >
                  Meet the Team
                </a>
              </li>
              <li>
                <a
                  href="https://morra.store/legal"
                  className="text-[#A0A0A0] hover:text-[#00FF94] text-sm transition-colors"
                >
                  Legal
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Legal</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://morra.store/privacy"
                  className="text-[#A0A0A0] hover:text-[#00FF94] text-sm transition-colors"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="https://morra.store/terms"
                  className="text-[#A0A0A0] hover:text-[#00FF94] text-sm transition-colors"
                >
                  Terms of Service
                </a>
              </li>
              <li>
                <a
                  href="https://morra.store/faq"
                  className="text-[#A0A0A0] hover:text-[#00FF94] text-sm transition-colors"
                >
                  FAQ
                </a>
              </li>
              <li>
                <a
                  href="https://morra.store/faq#ai-assistant"
                  className="text-[#A0A0A0] hover:text-[#00FF94] text-sm transition-colors"
                >
                  Contact (AI Assistant)
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border/50 space-y-3">
          <p className="text-center text-[#A0A0A0] text-sm">
            <Link href="/terms" className="text-[#A0A0A0] hover:text-[#00FF94] transition-colors">
              Terms
            </Link>
            <span className="mx-2 text-[#505050]">|</span>
            <Link href="/privacy" className="text-[#A0A0A0] hover:text-[#00FF94] transition-colors">
              Privacy
            </Link>
            <span className="mx-2 text-[#505050]">|</span>
            <Link href="/faq" className="text-[#A0A0A0] hover:text-[#00FF94] transition-colors">
              FAQ
            </Link>
          </p>
          <p className="text-center text-[#A0A0A0] text-sm">
            © {new Date().getFullYear()} MORRA. morra.store
          </p>
        </div>
      </div>
    </footer>
  );
}
