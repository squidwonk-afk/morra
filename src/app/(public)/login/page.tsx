import { Suspense } from "react";
import { Login } from "@/components/pages/Login";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A0A0A]" />}>
      <Login />
    </Suspense>
  );
}
