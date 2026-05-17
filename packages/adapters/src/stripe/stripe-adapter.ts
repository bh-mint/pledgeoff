import Stripe from 'stripe';
import { Result, ok, err } from 'neverthrow';

export class StripeAdapterError extends Error {
  readonly code = 'STRIPE_ADAPTER_ERROR' as const;
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
  }
}

export type CreateCheckoutSessionInput = {
  userId: string;
  userEmail: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  stripeCustomerId?: string | null;
};

export type CheckoutSession = {
  id: string;
  url: string;
};

export type StripeSubscriptionData = {
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: string;
  currentPeriodEnd: string | null;
  priceId: string;
};

export class StripeAdapter {
  private readonly stripe: Stripe;

  constructor(secretKey: string) {
    this.stripe = new Stripe(secretKey, { apiVersion: '2026-04-22.dahlia' });
  }

  async createCheckoutSession(
    input: CreateCheckoutSessionInput,
  ): Promise<Result<CheckoutSession, StripeAdapterError>> {
    try {
      const params: Stripe.Checkout.SessionCreateParams = {
        mode: 'subscription',
        line_items: [{ price: input.priceId, quantity: 1 }],
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        client_reference_id: input.userId,
        metadata: { userId: input.userId },
        subscription_data: { metadata: { userId: input.userId } },
        allow_promotion_codes: true,
      };

      if (input.stripeCustomerId) {
        params.customer = input.stripeCustomerId;
      } else {
        // Create customer first so we can attach userId metadata — subscription_data.metadata
        // is not reliably propagated to the subscription object in all Stripe API versions.
        const customer = await this.stripe.customers.create({
          email: input.userEmail,
          metadata: { userId: input.userId },
        });
        params.customer = customer.id;
      }

      const session = await this.stripe.checkout.sessions.create(params);
      if (!session.url) return err(new StripeAdapterError('Checkout session has no URL'));
      return ok({ id: session.id, url: session.url });
    } catch (e) {
      return err(new StripeAdapterError('Failed to create checkout session', e));
    }
  }

  constructWebhookEvent(
    payload: string | Buffer,
    signature: string,
    webhookSecret: string,
  ): Result<Stripe.Event, StripeAdapterError> {
    try {
      const event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      return ok(event);
    } catch (e) {
      return err(new StripeAdapterError('Invalid webhook signature', e));
    }
  }

  async getSubscription(
    subscriptionId: string,
  ): Promise<Result<StripeSubscriptionData, StripeAdapterError>> {
    try {
      const sub = await this.stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['items.data.price'],
      });

      const item = sub.items.data[0];
      const priceId = item?.price?.id ?? '';
      // In Stripe API v2026+, current_period_end lives on the subscription item
      const periodEnd = item?.current_period_end;
      return ok({
        stripeCustomerId: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
        stripeSubscriptionId: sub.id,
        status: sub.status,
        currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        priceId,
      });
    } catch (e) {
      return err(new StripeAdapterError('Failed to retrieve subscription', e));
    }
  }

  async getCustomerUserId(customerId: string): Promise<Result<string | null, StripeAdapterError>> {
    try {
      const customer = await this.stripe.customers.retrieve(customerId);
      if ('deleted' in customer) return ok(null);
      return ok(customer.metadata?.userId ?? null);
    } catch (e) {
      return err(new StripeAdapterError('Failed to retrieve customer', e));
    }
  }

  /**
   * Create, update, or remove the extra-seat add-on subscription item.
   * quantity=0 deletes the item. Returns the new item ID (or null if deleted).
   */
  async manageSeatAddon(input: {
    stripeSubscriptionId: string;
    extraSeatPriceId: string;
    quantity: number;
    existingItemId: string | null;
  }): Promise<Result<{ itemId: string | null }, StripeAdapterError>> {
    try {
      const { stripeSubscriptionId, extraSeatPriceId, quantity, existingItemId } = input;

      if (quantity === 0 && existingItemId) {
        await this.stripe.subscriptionItems.del(existingItemId, { proration_behavior: 'create_prorations' });
        return ok({ itemId: null });
      }

      if (quantity === 0) {
        return ok({ itemId: null });
      }

      if (existingItemId) {
        const item = await this.stripe.subscriptionItems.update(existingItemId, {
          quantity,
          proration_behavior: 'create_prorations',
        });
        return ok({ itemId: item.id });
      }

      const item = await this.stripe.subscriptionItems.create({
        subscription: stripeSubscriptionId,
        price: extraSeatPriceId,
        quantity,
        proration_behavior: 'create_prorations',
      });
      return ok({ itemId: item.id });
    } catch (e) {
      return err(new StripeAdapterError('Failed to manage seat add-on', e));
    }
  }

  async createCustomerPortalSession(
    customerId: string,
    returnUrl: string,
  ): Promise<Result<string, StripeAdapterError>> {
    try {
      const session = await this.stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });
      return ok(session.url);
    } catch (e) {
      return err(new StripeAdapterError('Failed to create customer portal session', e));
    }
  }
}
