export async function GET() {
  return Response.json({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
    anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "exists" : "missing",
    service: process.env.SUPABASE_SERVICE_ROLE_KEY ? "exists" : "missing",
  });
}