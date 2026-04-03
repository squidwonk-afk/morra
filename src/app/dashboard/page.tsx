import { redirect } from "next/navigation";

/** Alias so Stripe Connect return/refresh URLs can use /dashboard → main app home. */
export default function DashboardRedirectPage() {
  redirect("/app");
}
