import { validateProductionEnvironment } from "@/lib/env/validate-production";

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    validateProductionEnvironment();
  }
}
