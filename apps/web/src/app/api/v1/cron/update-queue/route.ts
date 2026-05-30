import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { logger } from '@pledgeoff/observability';
import { container } from '@/lib/container';
import { sendQueueAlertEmail } from '@pledgeoff/adapters';
import { requireCronAuth } from '@/lib/cron-auth';
import { createNotification } from '@pledgeoff/core';

export const maxDuration = 60;

// Max concurrent LLM calls per invocation — keeps latency under 60s even
// with a large user base and avoids hammering the LLM provider.
const CONCURRENCY = 5;

// Vercel Cron: daily at 02:30 UTC — re-scores all users' idea queues.
// Sends email alert when a priority score shifts >20% for any idea.
export async function GET(req: Request): Promise<Response> {
  const auth = requireCronAuth(req);
  if (!auth.ok) return Response.json({ error: auth.body }, { status: auth.status });

  const traceId = crypto.randomUUID();
  const supabase = createSupabaseServiceClient();

  const { data: rows, error } = await supabase
    .from('ideas')
    .select('user_id')
    .returns<{ user_id: string }[]>();

  if (error) {
    logger.error({ traceId, error: error.message }, 'update-queue: failed to fetch user ids');
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  const userIds = [...new Set((rows ?? []).map((r) => r.user_id))];
  let usersProcessed = 0;
  let totalSignificantChanges = 0;
  const errors: string[] = [];

  const resendKey = process.env.RESEND_API_KEY;
  const disableEmail = process.env.DISABLE_EMAIL === 'true';

  // Process users in parallel batches of CONCURRENCY to stay within the
  // 60s Vercel function timeout while still being faster than pure serial.
  for (let i = 0; i < userIds.length; i += CONCURRENCY) {
    const batch = userIds.slice(i, i + CONCURRENCY);

    await Promise.allSettled(
      batch.map(async (userId) => {
        const result = await container.updateDecisionQueueUseCase.execute({ userId, traceId });
        if (result.isErr()) {
          errors.push(`user ${userId}: ${result.error.message}`);
          logger.error({ traceId, userId, error: result.error.message }, 'update-queue: user processing failed');
          return;
        }

        usersProcessed++;
        totalSignificantChanges += result.value.significantChanges;

        if (result.value.significantChanges > 0) {
          // In-app notification (always, regardless of email preference)
          const notif = createNotification({
            userId,
            type: 'queue_alert',
            title: 'Decision queue updated',
            body: `${result.value.significantChanges} idea${result.value.significantChanges > 1 ? 's' : ''} shifted priority — check your queue.`,
          });
          await container.notificationRepo.save(notif).catch(() => {
            logger.error({ traceId, userId }, 'update-queue: failed to save notification');
          });

          if (resendKey && !disableEmail) {
            const { data: userData } = await supabase.auth.admin.getUserById(userId);
            const email = userData?.user?.email;
            if (email) {
              await sendQueueAlertEmail(resendKey, {
                to: email,
                significantChanges: result.value.significantChanges,
                traceId,
              }).catch((e: unknown) => {
                logger.error({ traceId, userId, error: String(e) }, 'update-queue: alert email failed');
              });
            }
          }
        }
      }),
    );
  }

  logger.info({ traceId, usersProcessed, totalSignificantChanges, errors }, 'update-queue: completed');

  return Response.json({
    ok: errors.length === 0,
    traceId,
    usersProcessed,
    totalSignificantChanges,
    ...(errors.length > 0 ? { errors } : {}),
  });
}
