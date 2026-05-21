import { resolveUserId } from '@/lib/api-auth';
import { container } from '@/lib/container';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { effectivePlan } from '@pledgeoff/core';
import { logger } from '@pledgeoff/observability';

export async function POST(req: Request): Promise<Response> {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();

  const userId = await resolveUserId(req.headers.get('authorization'));
  if (!userId) {
    return Response.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Valid authentication required' } },
      { status: 401, headers: { 'X-Trace-Id': traceId } },
    );
  }

  const subResult = await container._repos.subscriptionRepo.findByUserId(userId);
  const sub = subResult.isOk() ? subResult.value : null;
  const plan = sub ? effectivePlan(sub) : 'free';

  if (plan !== 'studio' && plan !== 'enterprise') {
    return Response.json(
      { error: { code: 'PLAN_REQUIRED', message: 'Invoice billing is available for Studio plan only' } },
      { status: 403, headers: { 'X-Trace-Id': traceId } },
    );
  }

  const supabase = createSupabaseServiceClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, username, company_name')
    .eq('id', userId)
    .single();

  const { data: authUser } = await supabase.auth.admin.getUserById(userId);
  const userEmail = authUser?.user?.email ?? 'unknown';

  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || userEmail;
  const companyName = profile?.company_name ?? null;

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const notificationHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:32px;background:#0a0a0a;font-family:-apple-system,sans-serif;color:#e0e0e0;">
  <p style="margin:0 0 4px;font-size:11px;color:#555;font-family:monospace;text-transform:uppercase;letter-spacing:0.08em;">INVOICE REQUEST · PLEDGEOFF</p>
  <h2 style="margin:8px 0 20px;font-size:18px;font-weight:700;color:#f5f5f5;">New NET30 Invoice Request</h2>
  <table style="border-collapse:collapse;width:100%;max-width:480px;">
    <tr><td style="padding:8px 12px;font-size:12px;color:#aaa;font-family:monospace;border:1px solid #2a2a2a;">Email</td><td style="padding:8px 12px;font-size:12px;color:#f5f5f5;border:1px solid #2a2a2a;">${userEmail}</td></tr>
    <tr><td style="padding:8px 12px;font-size:12px;color:#aaa;font-family:monospace;border:1px solid #2a2a2a;">Name</td><td style="padding:8px 12px;font-size:12px;color:#f5f5f5;border:1px solid #2a2a2a;">${displayName}</td></tr>
    <tr><td style="padding:8px 12px;font-size:12px;color:#aaa;font-family:monospace;border:1px solid #2a2a2a;">Company</td><td style="padding:8px 12px;font-size:12px;color:#f5f5f5;border:1px solid #2a2a2a;">${companyName ?? '—'}</td></tr>
    <tr><td style="padding:8px 12px;font-size:12px;color:#aaa;font-family:monospace;border:1px solid #2a2a2a;">Plan</td><td style="padding:8px 12px;font-size:12px;color:#b6f04c;font-family:monospace;border:1px solid #2a2a2a;">Studio</td></tr>
    <tr><td style="padding:8px 12px;font-size:12px;color:#aaa;font-family:monospace;border:1px solid #2a2a2a;">User ID</td><td style="padding:8px 12px;font-size:12px;color:#555;font-family:monospace;border:1px solid #2a2a2a;">${userId}</td></tr>
  </table>
  <p style="margin:24px 0 0;font-size:12px;color:#555;font-family:monospace;">Trace: ${traceId}</p>
</body>
</html>`;

    const start = Date.now();
    try {
      const notifRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'PledgeOFF Billing <billing@pledgeoff.com>',
          to: ['hello@pledgeoff.com'],
          subject: `[Invoice Request] ${displayName}${companyName ? ` — ${companyName}` : ''} — Studio`,
          html: notificationHtml,
          reply_to: userEmail,
        }),
      });
      logger.info(
        { traceId, target: 'resend', operation: 'invoice_request_notification', latencyMs: Date.now() - start, outcome: notifRes.ok ? 'success' : 'error' },
        'Invoice request notification sent',
      );
    } catch (err) {
      logger.error({ traceId, error: String(err) }, 'invoice_request.notification_failed');
    }
  }

  void container.auditLog.log({
    userId,
    action: 'invoice_requested',
    resourceType: 'billing',
    traceId,
  });

  logger.info({ traceId, userId, plan }, 'billing.invoice_requested');

  return Response.json({ data: { ok: true } }, { status: 200, headers: { 'X-Trace-Id': traceId } });
}
