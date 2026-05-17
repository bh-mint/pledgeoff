import type { Plan, SubscriptionStatus } from '@pledgeoff/core';
import { logger } from '@pledgeoff/observability';
import { container } from '@/lib/container';

// Map Stripe price IDs → plan names
function priceIdToPlan(priceId: string): Plan {
  const monthly = process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
  const annual = process.env.STRIPE_PRO_ANNUAL_PRICE_ID;
  const plusMonthly = process.env.STRIPE_PRO_PLUS_MONTHLY_PRICE_ID;
  const plusAnnual = process.env.STRIPE_PRO_PLUS_ANNUAL_PRICE_ID;

  if (priceId === plusMonthly || priceId === plusAnnual) return 'pro_plus';
  if (priceId === monthly || priceId === annual) return 'pro';

  throw new Error(`Unknown Stripe priceId: ${priceId}. Update STRIPE_*_PRICE_ID env vars.`);
}

function stripeStatusToInternal(status: string): SubscriptionStatus {
  const allowed: SubscriptionStatus[] = ['active', 'trialing', 'past_due', 'canceled', 'incomplete'];
  return allowed.includes(status as SubscriptionStatus)
    ? (status as SubscriptionStatus)
    : 'incomplete';
}

export async function POST(req: Request) {
  const traceId = crypto.randomUUID();

  if (!container.stripeAdapter) {
    return new Response('Stripe not configured', { status: 503 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return new Response('Webhook secret not configured', { status: 503 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 });
  }

  const rawBody = await req.text();
  const eventResult = container.stripeAdapter.constructWebhookEvent(rawBody, signature, webhookSecret);
  if (eventResult.isErr()) {
    logger.error({ traceId, error: eventResult.error.message }, 'webhook.stripe.invalid_signature');
    return new Response('Invalid signature', { status: 400 });
  }

  const event = eventResult.value;
  logger.info({ traceId, type: event.type, id: event.id }, 'webhook.stripe.received');

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as {
          client_reference_id?: string;
          customer?: string;
          subscription?: string;
        };

        const userId = session.client_reference_id;
        if (!userId) {
          logger.warn({ traceId }, 'webhook.stripe.checkout_missing_client_reference_id');
          break;
        }

        const stripeCustomerId = typeof session.customer === 'string' ? session.customer : null;
        const stripeSubscriptionId = typeof session.subscription === 'string' ? session.subscription : null;

        if (!stripeSubscriptionId) {
          logger.warn({ traceId }, 'webhook.stripe.checkout_missing_subscription');
          break;
        }

        // Fetch full subscription from Stripe to get price + status
        const subDataResult = await container.stripeAdapter.getSubscription(stripeSubscriptionId);
        if (subDataResult.isErr()) {
          logger.error(
            { traceId, subscriptionId: stripeSubscriptionId, error: subDataResult.error.message, cause: String(subDataResult.error.cause) },
            'webhook.stripe.subscription_fetch_failed',
          );
          return new Response('Failed to retrieve subscription', { status: 500 });
        }

        const subData = subDataResult.value;
        const plan = priceIdToPlan(subData.priceId);
        const status = stripeStatusToInternal(subData.status);

        await container.subscriptionRepo.upsert({
          userId,
          stripeCustomerId,
          stripeSubscriptionId,
          plan,
          status,
          currentPeriodEnd: subData.currentPeriodEnd,
        });

        logger.info({ traceId, userId, plan, status }, 'webhook.stripe.subscription_activated');
        break;
      }

      case 'customer.subscription.created': {
        const sub = event.data.object as {
          id: string;
          customer: string;
          status: string;
          metadata?: Record<string, string>;
          items: { data: Array<{ price: { id: string }; current_period_end?: number }> };
        };

        let userId = sub.metadata?.userId ?? null;

        // Fallback: subscription_data.metadata is not always propagated by Stripe.
        // Look up userId from the Stripe customer's metadata instead.
        if (!userId && typeof sub.customer === 'string') {
          const customerResult = await container.stripeAdapter.getCustomerUserId(sub.customer);
          if (customerResult.isOk()) userId = customerResult.value;
        }

        if (!userId) {
          logger.warn({ traceId, id: sub.id }, 'webhook.stripe.subscription_created_missing_userId');
          break;
        }

        const item = sub.items?.data?.[0];
        const priceId = item?.price?.id ?? '';
        const plan = priceIdToPlan(priceId);
        const status = stripeStatusToInternal(sub.status);
        const rawPeriodEnd = item?.current_period_end;
        const currentPeriodEnd = rawPeriodEnd ? new Date(rawPeriodEnd * 1000).toISOString() : null;
        const stripeCustomerId = typeof sub.customer === 'string' ? sub.customer : null;

        await container.subscriptionRepo.upsert({
          userId,
          stripeCustomerId,
          stripeSubscriptionId: sub.id,
          plan,
          status,
          currentPeriodEnd,
        });

        logger.info({ traceId, userId, plan, status }, 'webhook.stripe.subscription_created');
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as {
          id: string;
          status: string;
          items: { data: Array<{ price: { id: string }; current_period_end?: number }> };
        };

        const subResult = await container.subscriptionRepo.findByStripeSubscriptionId(sub.id);
        if (subResult.isErr() || !subResult.value) {
          logger.warn({ traceId, id: sub.id }, 'webhook.stripe.subscription_updated_not_found');
          break;
        }

        const item = sub.items?.data?.[0];
        const priceId = item?.price?.id ?? '';
        const plan = priceIdToPlan(priceId);
        const status = stripeStatusToInternal(sub.status);
        const rawPeriodEnd = item?.current_period_end;
        const currentPeriodEnd = rawPeriodEnd ? new Date(rawPeriodEnd * 1000).toISOString() : null;

        await container.subscriptionRepo.upsert({
          userId: subResult.value.userId,
          plan,
          status,
          currentPeriodEnd,
        });

        logger.info({ traceId, userId: subResult.value.userId, plan, status }, 'webhook.stripe.subscription_updated');
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as { id: string };

        const subResult = await container.subscriptionRepo.findByStripeSubscriptionId(sub.id);
        if (subResult.isErr() || !subResult.value) {
          logger.warn({ traceId, id: sub.id }, 'webhook.stripe.subscription_deleted_not_found');
          break;
        }

        await container.subscriptionRepo.upsert({
          userId: subResult.value.userId,
          plan: 'free',
          status: 'canceled',
        });

        logger.info({ traceId, userId: subResult.value.userId }, 'webhook.stripe.subscription_canceled');
        break;
      }

      default:
        logger.info({ traceId, type: event.type }, 'webhook.stripe.unhandled_event');
    }
  } catch (e) {
    logger.error({ traceId, type: event.type, error: String(e) }, 'webhook.stripe.handler_error');
    return new Response('Handler error', { status: 500 });
  }

  return new Response('ok', { status: 200 });
}
