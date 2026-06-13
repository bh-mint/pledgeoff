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

export type EmbeddedCheckoutSession = {
  id: string;
  clientSecret: string;
};

export type CreateEmbeddedCheckoutSessionInput = {
  userId: string;
  userEmail: string;
  priceId: string;
  returnUrl: string;
  stripeCustomerId?: string | null;
};

export type StripeSubscriptionData = {
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: string;
  currentPeriodEnd: string | null;
  priceId: string;
  cancelAtPeriodEnd: boolean;
  interval: 'monthly' | 'annual';
};

export class StripeAdapter {
  private readonly stripe: Stripe;
  private readonly taxEnabled: boolean;

  constructor(secretKey: string) {
    this.stripe = new Stripe(secretKey, { apiVersion: '2026-04-22.dahlia' });
    // automatic_tax requires Stripe Tax to be configured in the dashboard.
    // Enable only on live keys — test accounts typically don't have Stripe Tax set up.
    this.taxEnabled = secretKey.startsWith('sk_live_');
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
        automatic_tax: { enabled: this.taxEnabled },
        customer_update: { address: 'auto' },
        ...(this.taxEnabled ? { tax_id_collection: { enabled: true } } : {}),
        consent_collection: { terms_of_service: 'required' },
        custom_text: {
          terms_of_service_acceptance: {
            message:
              'By completing this purchase you expressly request immediate access to the digital service and acknowledge that you waive your 14-day right of withdrawal under EU Directive 2011/83/EU Art. 16(m). A voluntary 7-day money-back guarantee applies — email support@pledgeoff.com.',
          },
        },
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

  async createEmbeddedCheckoutSession(
    input: CreateEmbeddedCheckoutSessionInput,
  ): Promise<Result<EmbeddedCheckoutSession, StripeAdapterError>> {
    try {
      const params: Stripe.Checkout.SessionCreateParams = {
        ui_mode: 'embedded_page',
        mode: 'subscription',
        line_items: [{ price: input.priceId, quantity: 1 }],
        return_url: input.returnUrl,
        client_reference_id: input.userId,
        metadata: { userId: input.userId },
        subscription_data: { metadata: { userId: input.userId } },
        allow_promotion_codes: true,
        automatic_tax: { enabled: this.taxEnabled },
        customer_update: { address: 'auto' },
        ...(this.taxEnabled ? { tax_id_collection: { enabled: true } } : {}),
        consent_collection: { terms_of_service: 'required' },
        custom_text: {
          terms_of_service_acceptance: {
            message:
              'By completing this purchase you expressly request immediate access to the digital service and acknowledge that you waive your 14-day right of withdrawal under EU Directive 2011/83/EU Art. 16(m). A voluntary 7-day money-back guarantee applies — email support@pledgeoff.com.',
          },
        },
      };

      if (input.stripeCustomerId) {
        params.customer = input.stripeCustomerId;
      } else {
        const customer = await this.stripe.customers.create({
          email: input.userEmail,
          metadata: { userId: input.userId },
        });
        params.customer = customer.id;
      }

      const session = await this.stripe.checkout.sessions.create(params);
      if (!session.client_secret) return err(new StripeAdapterError('Embedded checkout session has no client_secret'));
      return ok({ id: session.id, clientSecret: session.client_secret });
    } catch (e) {
      return err(new StripeAdapterError('Failed to create embedded checkout session', e));
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
      const periodEnd = item?.current_period_end;
      const recurringInterval = (item?.price as Stripe.Price & { recurring?: { interval?: string } })?.recurring?.interval;
      return ok({
        stripeCustomerId: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
        stripeSubscriptionId: sub.id,
        status: sub.status,
        currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        priceId,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        interval: recurringInterval === 'year' ? 'annual' : 'monthly',
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

  async updateSubscription(
    subscriptionId: string,
    newPriceId: string,
  ): Promise<Result<void, StripeAdapterError>> {
    try {
      const sub = await this.stripe.subscriptions.retrieve(subscriptionId);
      const itemId = sub.items.data[0]?.id;
      if (!itemId) return err(new StripeAdapterError('Subscription has no items'));
      await this.stripe.subscriptions.update(subscriptionId, {
        items: [{ id: itemId, price: newPriceId }],
        proration_behavior: 'create_prorations',
      });
      return ok(undefined);
    } catch (e) {
      return err(new StripeAdapterError('Failed to update subscription', e));
    }
  }

  async cancelSubscription(
    subscriptionId: string,
  ): Promise<Result<void, StripeAdapterError>> {
    try {
      await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
      return ok(undefined);
    } catch (e) {
      return err(new StripeAdapterError('Failed to cancel subscription', e));
    }
  }

  async reactivateSubscription(
    subscriptionId: string,
  ): Promise<Result<void, StripeAdapterError>> {
    try {
      await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      });
      return ok(undefined);
    } catch (e) {
      return err(new StripeAdapterError('Failed to reactivate subscription', e));
    }
  }

  async payLatestInvoice(
    stripeSubscriptionId: string,
  ): Promise<Result<{ paid: boolean }, StripeAdapterError>> {
    try {
      const sub = await this.stripe.subscriptions.retrieve(stripeSubscriptionId, {
        expand: ['latest_invoice'],
      });
      const invoice = sub.latest_invoice as Stripe.Invoice | null;
      if (!invoice || invoice.status === 'paid') return ok({ paid: true });

      const result = await this.stripe.invoices.pay(invoice.id);
      return ok({ paid: result.status === 'paid' });
    } catch (e) {
      return err(new StripeAdapterError('Failed to pay latest invoice', e));
    }
  }

  async createOttoPackCheckoutSession(input: {
    userId: string;
    userEmail: string;
    priceId: string;
    questionCount: number;
    successUrl: string;
    cancelUrl: string;
    stripeCustomerId?: string | null;
  }): Promise<Result<CheckoutSession, StripeAdapterError>> {
    try {
      const params: Stripe.Checkout.SessionCreateParams = {
        mode: 'payment',
        line_items: [{ price: input.priceId, quantity: 1 }],
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        customer_email: input.stripeCustomerId ? undefined : input.userEmail,
        customer: input.stripeCustomerId ?? undefined,
        metadata: {
          userId: input.userId,
          ottoPackQuestions: String(input.questionCount),
          type: 'otto_pack',
        },
        automatic_tax: { enabled: this.taxEnabled },
        ...(this.taxEnabled ? { tax_id_collection: { enabled: true } } : {}),
        consent_collection: { terms_of_service: 'required' },
        custom_text: {
          terms_of_service_acceptance: {
            message:
              'By completing this purchase you expressly request immediate access to the digital service and acknowledge that you waive your 14-day right of withdrawal under EU Directive 2011/83/EU Art. 16(m). A voluntary 7-day money-back guarantee applies — email support@pledgeoff.com.',
          },
        },
      };

      const session = await this.stripe.checkout.sessions.create(params);
      if (!session.url) return err(new StripeAdapterError('No checkout URL returned'));
      return ok({ id: session.id, url: session.url });
    } catch (e) {
      return err(new StripeAdapterError('Failed to create Otto pack checkout session', e));
    }
  }

  async createValidationPackCheckoutSession(input: {
    userId: string;
    userEmail: string;
    priceId: string;
    validationCount: number;
    successUrl: string;
    cancelUrl: string;
    stripeCustomerId?: string | null;
  }): Promise<Result<CheckoutSession, StripeAdapterError>> {
    try {
      const params: Stripe.Checkout.SessionCreateParams = {
        mode: 'payment',
        line_items: [{ price: input.priceId, quantity: 1 }],
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        customer_email: input.stripeCustomerId ? undefined : input.userEmail,
        customer: input.stripeCustomerId ?? undefined,
        metadata: {
          userId: input.userId,
          validationPackCount: String(input.validationCount),
          type: 'validation_pack',
        },
        automatic_tax: { enabled: this.taxEnabled },
        ...(this.taxEnabled ? { tax_id_collection: { enabled: true } } : {}),
        consent_collection: { terms_of_service: 'required' },
        custom_text: {
          terms_of_service_acceptance: {
            message:
              'By completing this purchase you expressly request immediate access to the digital service and acknowledge that you waive your 14-day right of withdrawal under EU Directive 2011/83/EU Art. 16(m). A voluntary 7-day money-back guarantee applies — email support@pledgeoff.com.',
          },
        },
      };

      const session = await this.stripe.checkout.sessions.create(params);
      if (!session.url) return err(new StripeAdapterError('No checkout URL returned'));
      return ok({ id: session.id, url: session.url });
    } catch (e) {
      return err(new StripeAdapterError('Failed to create validation pack checkout session', e));
    }
  }

  async getCustomerVatId(customerId: string): Promise<Result<{ id: string; value: string } | null, StripeAdapterError>> {
    try {
      const taxIds = await this.stripe.customers.listTaxIds(customerId, { limit: 10 });
      const vatId = taxIds.data.find((t) => t.type === 'eu_vat' && !t.deleted);
      if (!vatId) return ok(null);
      return ok({ id: vatId.id, value: vatId.value });
    } catch (e) {
      return err(new StripeAdapterError('Failed to fetch customer tax IDs', e));
    }
  }

  async upsertCustomerVatId(
    customerId: string,
    vatId: string | null,
  ): Promise<Result<{ value: string } | null, StripeAdapterError>> {
    try {
      // Remove all existing eu_vat entries first (Stripe tax IDs are immutable)
      const existing = await this.stripe.customers.listTaxIds(customerId, { limit: 10 });
      const euVats = existing.data.filter((t) => t.type === 'eu_vat' && !t.deleted);
      await Promise.all(euVats.map((t) => this.stripe.customers.deleteTaxId(customerId, t.id)));

      if (!vatId) return ok(null);

      const created = await this.stripe.customers.createTaxId(customerId, {
        type: 'eu_vat',
        value: vatId.trim().toUpperCase(),
      });
      return ok({ value: created.value });
    } catch (e) {
      return err(new StripeAdapterError('Failed to upsert customer VAT ID', e));
    }
  }
}
