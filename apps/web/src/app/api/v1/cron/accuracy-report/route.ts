import { logger } from '@pledgeoff/observability';
import { sendAccuracyReportEmail } from '@pledgeoff/adapters';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { container } from '@/lib/container';

export const maxDuration = 60;

// Runs monthly (2nd of each month, 09:00 UTC) — after reset-otto-balance on the 1st.
// Sends accuracy report to users with ≥3 reported outcomes.
export async function GET(req: Request): Promise<Response> {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    logger.error({ traceId: crypto.randomUUID() }, 'CRON_SECRET not set — refusing to execute cron');
    return Response.json({ error: 'Server misconfiguration' }, { status: 503 });
  }

  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    logger.warn({ traceId: crypto.randomUUID() }, 'accuracy-report: RESEND_API_KEY not set, skipping');
    return Response.json({ ok: true, sent: 0, skipped: 'no resend key' });
  }

  const traceId = crypto.randomUUID();
  const supabase = createSupabaseServiceClient();

  const reportsResult = await container.getUsersAccuracyReportUseCase.execute();
  if (reportsResult.isErr()) {
    logger.error({ traceId, error: String(reportsResult.error) }, 'accuracy-report: failed to get reports');
    return Response.json({ ok: false }, { status: 500 });
  }

  const reports = reportsResult.value;
  let sent = 0;
  let failed = 0;

  for (const report of reports) {
    const userTraceId = crypto.randomUUID();
    try {
      const { data } = await supabase.auth.admin.getUserById(report.userId);
      const email = data.user?.email;
      if (!email) continue;

      await sendAccuracyReportEmail(resendApiKey, {
        to: email,
        accuracyRate: report.stats.accuracyRate,
        totalOutcomes: report.stats.totalOutcomes,
        byVerdict: report.stats.byVerdict,
        traceId: userTraceId,
      });
      sent++;
    } catch (error) {
      failed++;
      logger.error({ traceId: userTraceId, userId: report.userId, error: String(error) }, 'accuracy-report: failed to send email for user');
    }
  }

  logger.info({ traceId, total: reports.length, sent, failed }, 'accuracy-report: completed');
  return Response.json({ ok: true, total: reports.length, sent, failed });
}
