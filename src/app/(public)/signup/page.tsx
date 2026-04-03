import { Suspense } from "react";
import { Signup } from "@/components/pages/Signup";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A0A0A]" />}>
      <Signup />
    </Suspense>
  );
}
