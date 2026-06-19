import { z } from "zod";
import { logger } from "@pledgeoff/observability";
import { checkPublicRateLimit, getClientIp } from "@/lib/rate-limiter";

const BodySchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(200),
  companySize: z.enum(["1-10", "10-50", "50-200", "200+"]),
});

export async function POST(req: Request): Promise<Response> {
  const traceId = req.headers.get("x-trace-id") ?? crypto.randomUUID();

  const ip = getClientIp(req);
  const rl = await checkPublicRateLimit(ip);
  if (!rl.allowed) {
    return Response.json(
      { error: "TOO_MANY_REQUESTS" },
      { status: 429, headers: { "X-Trace-Id": traceId, "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } },
    );
  }

  const body = await req.json() as unknown;
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "VALIDATION_FAILED" }, { status: 400 });
  }

  const { name, email, companySize } = parsed.data;

  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "PledgeOFF <noreply@pledgeoff.com>",
          to: ["partnerships@pledgeoff.com"],
          subject: `Enterprise enquiry — ${name} (${companySize})`,
          html: `<p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Team size:</strong> ${companySize}</p>`,
          reply_to: email,
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        logger.error({ traceId, target: "resend", status: res.status }, "enterprise.contact_email_failed");
      }
    } catch (e) {
      logger.error({ traceId, target: "resend", error: String(e) }, "enterprise.contact_email_timeout");
    }
  } else {
    logger.info({ traceId, name, email, companySize }, "enterprise.contact_no_resend_key");
  }

  return Response.json({ data: { ok: true } }, { status: 200 });
}
