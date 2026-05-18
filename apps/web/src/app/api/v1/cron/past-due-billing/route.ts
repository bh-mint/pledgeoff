import { logger } from '@pledgeoff/observability';
import { container } from '@/lib/container';

export const maxDuration = 30;

// Runs every hour. For subscriptions past_due for 24h+: retry payment via Stripe.
// If payment still fails → downgrade to free and remove team access.
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

  const traceId = crypto.randomUUID();

  if (!container.stripeAdapter) {
    logger.warn({ traceId }, 'past-due-billing: Stripe not configured, skipping');
    return Response.json({ ok: true, processed: 0 });
  }

  const subsResult = await container.subscriptionRepo.findPastDueForRetry();
  if (subsResult.isErr()) {
    logger.error({ traceId, error: subsResult.error.message }, 'past-due-billing: failed to fetch subscriptions');
    return Response.json({ ok: false }, { status: 500 });
  }

  const subs = subsResult.value;
  logger.info({ traceId, count: subs.length }, 'past-due-billing: processing');

  let downgraded = 0;
  let recovered = 0;

  for (const sub of subs) {
    if (!sub.stripeSubscriptionId) {
      await container.subscriptionRepo.downgradeToFree(sub.userId);
      downgraded++;
      continue;
    }

    const payResult = await container.stripeAdapter.payLatestInvoice(sub.stripeSubscriptionId);

    if (payResult.isErr()) {
      logger.warn({ traceId, userId: sub.userId, error: payResult.error.message }, 'past-due-billing: stripe pay error, downgrading');
      await container.subscriptionRepo.downgradeToFree(sub.userId);
      downgraded++;
      continue;
    }

    if (payResult.value.paid) {
      logger.info({ traceId, userId: sub.userId }, 'past-due-billing: payment recovered');
      recovered++;
    } else {
      logger.info({ traceId, userId: sub.userId }, 'past-due-billing: payment still failed, downgrading');
      await container.subscriptionRepo.downgradeToFree(sub.userId);
      downgraded++;
    }
  }

  logger.info({ traceId, downgraded, recovered }, 'past-due-billing: done');
  return Response.json({ ok: true, downgraded, recovered });
}
