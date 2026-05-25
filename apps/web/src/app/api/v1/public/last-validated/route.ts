import { createSupabaseServiceClient } from "@/lib/supabase-server";
import { logger } from "@pledgeoff/observability";

export const runtime = "nodejs";
export const revalidate = 60; // cache 60s

export async function GET(req: Request) {
  const traceId = req.headers.get("x-trace-id") ?? crypto.randomUUID();
  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase
    .from("decisions")
    .select("created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    logger.error({ traceId, error: error.message }, "last-validated: db error");
    return Response.json({ data: null }, { status: 200 });
  }

  return Response.json(
    { data: data ? { lastValidatedAt: data.created_at } : null },
    { status: 200, headers: { "X-Trace-Id": traceId } }
  );
}
