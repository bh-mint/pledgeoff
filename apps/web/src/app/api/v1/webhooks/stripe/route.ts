import type { Plan, SubscriptionStatus } from '@pledgeoff/core';
import { container } from '@/lib/container';

// Map Stripe price IDs → plan names
function priceIdToPlan(priceId: string): Plan {
  const monthly = process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
  const annual = process.env.STRIPE_PRO_ANNUAL_PRICE_ID;
  const plusMonthly = process.env.STRIPE_PRO_PLUS_MONTHLY_PRICE_ID;
  const plusAnnual = process.env.STRIPE_PRO_PLUS_ANNUAL_PRICE_ID;

  if (priceId === plusMonthly || priceId === plusAnnual) return 'pro_plus';
  if (priceId === monthly || priceId === annual) return 'pro';
  return 'free';
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
    console.error('[webhook/stripe] Invalid signature', { traceId, error: eventResult.error.message });
    return new Response('Invalid signature', { status: 400 });
  }

  const event = eventResult.value;
  console.info('[webhook/stripe] received', { traceId, type: event.type, id: event.id });

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
          console.warn('[webhook/stripe] checkout.session.completed missing client_reference_id', { traceId });
          break;
        }

        const stripeCustomerId = typeof session.customer === 'string' ? session.customer : null;
        const stripeSubscriptionId = typeof session.subscription === 'string' ? session.subscription : null;

        if (!stripeSubscriptionId) {
          console.warn('[webhook/stripe] checkout.session.completed missing subscription', { traceId });
          break;
        }

        // Fetch full subscription from Stripe to get price + status
        const subDataResult = await container.stripeAdapter.getSubscription(stripeSubscriptionId);
        if (subDataResult.isErr()) {
          console.error('[webhook/stripe] Failed to retrieve subscription — returning 500 for Stripe retry', {
            traceId,
            subscriptionId: stripeSubscriptionId,
            error: subDataResult.error.message,
            cause: String(subDataResult.error.cause),
          });
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

        console.info('[webhook/stripe] subscription activated', { traceId, userId, plan, status });
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
          console.warn('[webhook/stripe] subscription.created could not resolve userId', { traceId, id: sub.id });
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

        console.info('[webhook/stripe] subscription created → activated', { traceId, userId, plan, status });
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
          console.warn('[webhook/stripe] subscription.updated — subscription not found', { traceId, id: sub.id });
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

        console.info('[webhook/stripe] subscription updated', { traceId, userId: subResult.value.userId, plan, status });
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as { id: string };

        const subResult = await container.subscriptionRepo.findByStripeSubscriptionId(sub.id);
        if (subResult.isErr() || !subResult.value) {
          console.warn('[webhook/stripe] subscription.deleted — subscription not found', { traceId, id: sub.id });
          break;
        }

        await container.subscriptionRepo.upsert({
          userId: subResult.value.userId,
          plan: 'free',
          status: 'canceled',
        });

        console.info('[webhook/stripe] subscription canceled → downgraded to free', { traceId, userId: subResult.value.userId });
        break;
      }

      default:
        console.info('[webhook/stripe] unhandled event type', { traceId, type: event.type });
    }
  } catch (e) {
    console.error('[webhook/stripe] handler threw', { traceId, type: event.type, error: String(e) });
    return new Response('Handler error', { status: 500 });
  }

  return new Response('ok', { status: 200 });
}
