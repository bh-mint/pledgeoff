import { z } from "zod";
import { createSupabaseServiceClient } from "@/lib/supabase-server";
import { logger } from "@pledgeoff/observability";

const RequestSchema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  const traceId = req.headers.get("x-trace-id") ?? crypto.randomUUID();
  const origin = new URL(req.url).origin;

  const body = await req.json().catch(() => ({}));
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: `${origin}/auth/callback?next=/onboarding` },
  });

  if (error) {
    logger.error({ traceId, email: parsed.data.email, errorCode: error.message }, "resend_verification_failed");
  }

  // Always return 200 — don't reveal whether email exists
  return Response.json({ ok: true }, { headers: { "X-Trace-Id": traceId } });
}
