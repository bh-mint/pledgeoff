import { Result, ok, err } from 'neverthrow';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Subscription } from '@pledgeoff/core';
import {
  SubscriptionRepositoryError,
  type ISubscriptionRepository,
  type SubscriptionUpsertInput,
  type SubscriptionSeatUpdateInput,
  type SubscriptionPlanUpdateInput,
} from '@pledgeoff/core';

type SubscriptionRow = {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: string;
  status: string;
  current_period_end: string | null;
  extra_seats: number;
  stripe_extra_seat_item_id: string | null;
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
    extraSeats: row.extra_seats ?? 0,
    stripeExtraSeatItemId: row.stripe_extra_seat_item_id ?? null,
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

  async updatePlan(input: SubscriptionPlanUpdateInput): Promise<Result<Subscription, SubscriptionRepositoryError>> {
    const { data, error } = await this.client
      .from('subscriptions')
      .update({
        plan: input.plan,
        status: input.status,
        current_period_end: input.currentPeriodEnd,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', input.userId)
      .select()
      .single<SubscriptionRow>();

    if (error) return err(new SubscriptionRepositoryError(error.message));
    return ok(rowToSubscription(data));
  }

  async updateExtraSeats(input: SubscriptionSeatUpdateInput): Promise<Result<Subscription, SubscriptionRepositoryError>> {
    const { data, error } = await this.client
      .from('subscriptions')
      .update({
        extra_seats: input.extraSeats,
        stripe_extra_seat_item_id: input.stripeExtraSeatItemId,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', input.userId)
      .select()
      .single<SubscriptionRow>();

    if (error) return err(new SubscriptionRepositoryError(error.message));
    return ok(rowToSubscription(data));
  }
}
