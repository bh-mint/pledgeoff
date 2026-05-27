import { logger } from "@pledgeoff/observability";
import { createSupabaseServiceClient } from "@/lib/supabase-server";

interface NewUserPayload {
  type: "INSERT";
  table: "profiles";
  schema: "public";
  record: {
    id: string;
    email: string;
    first_name?: string | null;
    last_name?: string | null;
    avatar_url?: string | null;
    created_at: string;
  };
}

function isAuthorized(req: Request): boolean {
  const secret = process.env.WEBHOOK_SECRET_NEW_USER;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

function buildWelcomeEmail(email: string, name?: string): string {
  const displayName = name?.split(" ")[0] ?? "there";
  const shell = (content: string) => `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding-bottom:32px;">
          <span style="font-size:15px;font-weight:600;color:#f5f5f5;letter-spacing:-0.02em;">Pledge<span style="color:#b6f04c;">OFF</span></span>
        </td></tr>
        <tr><td style="background:#141414;border:1px solid #2a2a2a;border-radius:8px;padding:32px;">
          ${content}
        </td></tr>
        <tr><td style="padding-top:24px;">
          <p style="margin:0;font-size:11px;color:#555;font-family:monospace;">
            © 2026 PledgeOFF &nbsp;·&nbsp;
            <a href="https://pledgeoff.com" style="color:#555;text-decoration:none;">pledgeoff.com</a>
            &nbsp;·&nbsp;
            <a href="https://pledgeoff.com/privacy" style="color:#555;text-decoration:none;">Privacy</a>
            &nbsp;·&nbsp;
            <a href="https://pledgeoff.com/terms" style="color:#555;text-decoration:none;">Terms</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return shell(`
    <p style="margin:0 0 4px;font-size:11px;color:#555;font-family:monospace;text-transform:uppercase;letter-spacing:0.08em;">WELCOME · PLEDGEOFF</p>
    <h1 style="margin:8px 0 20px;font-size:22px;font-weight:700;color:#f5f5f5;letter-spacing:-0.03em;line-height:1.1;">
      Hey ${displayName}, you're in.
    </h1>
    <p style="margin:0 0 16px;font-size:14px;color:#aaa;line-height:1.6;">
      PledgeOFF validates your startup ideas against real signals from Reddit and GitHub — and gives you a <strong style="color:#f5f5f5;">GO / KILL / PIVOT</strong> verdict in under 60 seconds.
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#aaa;line-height:1.6;">
      You get <strong style="color:#f5f5f5;">1 free validation per month</strong> to start. No card required.
    </p>
    <a href="https://pledgeoff.com/ideas/new" style="display:inline-block;background:#b6f04c;color:#000;font-size:13px;font-weight:600;padding:10px 20px;border-radius:6px;text-decoration:none;letter-spacing:-0.01em;">
      Validate your first idea →
    </a>
    <hr style="border:none;border-top:1px solid #2a2a2a;margin:28px 0;">
    <p style="margin:0 0 8px;font-size:12px;color:#555;line-height:1.6;">
      Questions? Reply to this email or write to
      <a href="mailto:support@pledgeoff.com" style="color:#888;text-decoration:none;">support@pledgeoff.com</a>.
    </p>
    <p style="margin:0;font-size:11px;color:#444;font-family:monospace;">
      — PledgeOFF Team
    </p>
  `);
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: NewUserPayload;
  try {
    payload = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (payload.type !== "INSERT" || payload.table !== "profiles") {
    return Response.json({ ok: true, skipped: true });
  }

  const { id, email, first_name, last_name } = payload.record;
  const name = [first_name, last_name].filter(Boolean).join(" ") || undefined;

  const traceId = id;

  if (process.env.DISABLE_EMAIL === 'true') {
    logger.info({ traceId, target: "resend" }, "Welcome email disabled via DISABLE_EMAIL flag");
    return Response.json({ ok: true, skipped: true });
  }

  // Idempotency guard — Supabase retries webhooks; prevent duplicate welcome emails.
  // Service role bypasses RLS on processed_events, so this is safe.
  const supabase = createSupabaseServiceClient();
  const idempotencyKey = id; // user UUID is unique per new-user webhook
  const { error: idempotencyError } = await supabase
    .from('processed_events')
    .insert({ event_id: idempotencyKey });
  if (idempotencyError) {
    // Duplicate key = already processed → skip silently
    if (idempotencyError.code === '23505') {
      logger.info({ traceId }, "Welcome email already sent — skipping duplicate webhook");
      return Response.json({ ok: true, skipped: true });
    }
    logger.error({ traceId, error: idempotencyError.message }, "Failed to insert idempotency key");
  }

  // Mark when welcome email was dispatched — idempotency check above guarantees at-most-once.
  void supabase
    .from('profiles')
    .update({ welcome_email_sent_at: new Date().toISOString() })
    .eq('id', id);

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    logger.error({ traceId, target: "resend" }, "RESEND_API_KEY not set");
    return Response.json({ error: "Email service not configured" }, { status: 500 });
  }

  // Fire-and-forget — Supabase retries on 500, causing duplicate emails
  sendWelcomeEmail(resendKey, email, name, traceId).catch((err) => {
    logger.error({ traceId, target: "resend", err }, "welcome email failed (fire-and-forget)");
  });

  return Response.json({ ok: true });
}

async function sendWelcomeEmail(resendKey: string, email: string, name: string | undefined, traceId: string): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "PledgeOFF <no-reply@pledgeoff.com>",
      to: [email],
      subject: "Welcome to PledgeOFF — validate your first idea",
      html: buildWelcomeEmail(email, name),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    logger.error({ traceId, target: "resend", outcome: "error", errorCode: String(res.status), err }, "welcome email failed");
    return;
  }

  logger.info({ traceId, target: "resend", outcome: "success" }, "welcome email sent");
}
