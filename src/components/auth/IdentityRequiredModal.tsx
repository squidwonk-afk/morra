"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/utils";

type Props = {
  open: boolean;
};

/**
 * Blocks all interaction behind it (Radix modal + non-dismissible overlay).
 * Used when the app shell is shown without a valid session.
 */
export function IdentityRequiredModal({ open }: Props) {
  const pathname = usePathname() || "/app";
  const next = encodeURIComponent(pathname.startsWith("/") ? pathname : `/${pathname}`);

  return (
    <DialogPrimitive.Root open={open} modal>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-[300] bg-[#0A0A0A]/85 backdrop-blur-md",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          )}
        />
        <DialogPrimitive.Content
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          className={cn(
            "fixed top-1/2 left-1/2 z-[301] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2",
            "rounded-2xl border border-[#00FF94]/30 bg-[#121212] p-8 shadow-[0_0_60px_rgba(0,255,148,0.12)]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-200",
            "focus:outline-none"
          )}
        >
          <DialogPrimitive.Title className="text-xl font-bold text-center text-white mb-2">
            Create your identity to continue
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="text-sm text-[#A0A0A0] text-center mb-8 leading-relaxed">
            Sign up or log in to use the dashboard, AI tools, and rewards.
          </DialogPrimitive.Description>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              asChild
              className="w-full sm:flex-1 bg-[#00FF94] text-[#0A0A0A] hover:bg-[#00FF94]/90 font-semibold"
            >
              <Link href={`/signup?next=${next}`}>Sign Up</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full sm:flex-1 border-[#00FF94]/40 text-[#00FF94] hover:bg-[#00FF94]/10"
            >
              <Link href={`/login?next=${next}`}>Log In</Link>
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
