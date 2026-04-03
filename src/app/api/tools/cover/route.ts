import type { NextRequest } from "next/server";
import { runAuthedTool } from "@/lib/api/run-authed-tool";

export async function POST(req: NextRequest) {
  return runAuthedTool(req, "cover");
}
