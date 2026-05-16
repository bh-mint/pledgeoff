import { Result, ok, err } from 'neverthrow';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Subscription } from '@pledgeoff/core';
import {
  SubscriptionRepositoryError,
  type ISubscriptionRepository,
  type SubscriptionUpsertInput,
} from '@pledgeoff/core';

type SubscriptionRow = {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: string;
  status: string;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
};

function rowToSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    userId: row.user_id,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    plan: row.plan as Subscription['plan'],
    status: row.status as Subscription['status'],
    currentPeriodEnd: row.current_period_end,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SupabaseSubscriptionRepository implements ISubscriptionRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findByUserId(userId: string): Promise<Result<Subscription | null, SubscriptionRepositoryError>> {
    const { data, error } = await this.client
      .from('subscriptions')
      .select()
      .eq('user_id', userId)
      .maybeSingle<SubscriptionRow>();

    if (error) return err(new SubscriptionRepositoryError(error.message));
    return ok(data ? rowToSubscription(data) : null);
  }

  async findByStripeCustomerId(customerId: string): Promise<Result<Subscription | null, SubscriptionRepositoryError>> {
    const { data, error } = await this.client
      .from('subscriptions')
      .select()
      .eq('stripe_customer_id', customerId)
      .maybeSingle<SubscriptionRow>();

    if (error) return err(new SubscriptionRepositoryError(error.message));
    return ok(data ? rowToSubscription(data) : null);
  }

  async findByStripeSubscriptionId(subscriptionId: string): Promise<Result<Subscription | null, SubscriptionRepositoryError>> {
    const { data, error } = await this.client
      .from('subscriptions')
      .select()
      .eq('stripe_subscription_id', subscriptionId)
      .maybeSingle<SubscriptionRow>();

    if (error) return err(new SubscriptionRepositoryError(error.message));
    return ok(data ? rowToSubscription(data) : null);
  }

  async upsert(input: SubscriptionUpsertInput): Promise<Result<Subscription, SubscriptionRepositoryError>> {
    const { data, error } = await this.client
      .from('subscriptions')
      .upsert(
        {
          user_id: input.userId,
          stripe_customer_id: input.stripeCustomerId ?? null,
          stripe_subscription_id: input.stripeSubscriptionId ?? null,
          plan: input.plan ?? 'free',
          status: input.status ?? 'active',
          current_period_end: input.currentPeriodEnd ?? null,
        },
        { onConflict: 'user_id' },
      )
      .select()
      .single<SubscriptionRow>();

    if (error) return err(new SubscriptionRepositoryError(error.message));
    return ok(rowToSubscription(data));
  }
}
