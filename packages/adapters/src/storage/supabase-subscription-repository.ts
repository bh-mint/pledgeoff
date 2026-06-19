import { Result, ok, err } from 'neverthrow';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Subscription } from '@pledgeoff/core';
import {
  SubscriptionRepositoryError,
  VerificationsExhaustedError,
  subscriptionFromPersistence,
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
  past_due_since: string | null;
  otto_included_used: number;
  otto_included_reset_at: string | null;
  otto_purchased: number;
  verifications_purchased: number;
  admin_override: boolean;
  created_at: string;
  updated_at: string;
};

function rowToSubscription(row: SubscriptionRow): Subscription {
  return subscriptionFromPersistence({
    id: row.id,
    userId: row.user_id,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    plan: row.plan,
    status: row.status,
    currentPeriodEnd: row.current_period_end,
    extraSeats: row.extra_seats ?? 0,
    stripeExtraSeatItemId: row.stripe_extra_seat_item_id ?? null,
    pastDueSince: row.past_due_since ?? null,
    ottoIncludedUsed: row.otto_included_used ?? 0,
    ottoIncludedResetAt: row.otto_included_reset_at ?? null,
    ottoPurchased: row.otto_purchased ?? 0,
    verificationsPurchased: row.verifications_purchased ?? 0,
    adminOverride: row.admin_override ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
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

  async findPastDueForRetry(): Promise<Result<Subscription[], SubscriptionRepositoryError>> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await this.client
      .from('subscriptions')
      .select()
      .eq('status', 'past_due')
      .not('past_due_since', 'is', null)
      .lte('past_due_since', cutoff)
      .overrideTypes<SubscriptionRow[]>();

    if (error) return err(new SubscriptionRepositoryError(error.message));
    return ok((data ?? []).map(rowToSubscription));
  }

  async setPastDueSince(userId: string, since: string): Promise<Result<void, SubscriptionRepositoryError>> {
    const { error } = await this.client
      .from('subscriptions')
      .update({ past_due_since: since, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('past_due_since', null);

    if (error) return err(new SubscriptionRepositoryError(error.message));
    return ok(undefined);
  }

  async downgradeToFree(userId: string): Promise<Result<void, SubscriptionRepositoryError>> {
    const { error } = await this.client
      .from('subscriptions')
      .update({
        plan: 'free',
        status: 'canceled',
        past_due_since: null,
        extra_seats: 0,
        stripe_extra_seat_item_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) return err(new SubscriptionRepositoryError(error.message));
    return ok(undefined);
  }

  async deductVerification(userId: string): Promise<Result<void, SubscriptionRepositoryError | VerificationsExhaustedError>> {
    // Uses deduct_verification SQL function — holds a row-level FOR UPDATE lock on subscriptions
    // and atomically counts ideas this month to avoid SELECT-then-UPDATE race on the pack balance.
    const { data, error } = await this.client
      .rpc('deduct_verification', { p_user_id: userId });

    if (error) return err(new SubscriptionRepositoryError(error.message));
    if (data === 'not_found') return err(new SubscriptionRepositoryError('Subscription not found'));
    if (data === 'no_balance') return err(new VerificationsExhaustedError());

    return ok(undefined);
  }

  async deductOttoQuestion(userId: string, includedLimit: number): Promise<Result<void, SubscriptionRepositoryError>> {
    // Uses the deduct_otto_question SQL function which holds a row-level lock
    // for the full transaction, eliminating the SELECT-then-UPDATE race condition.
    // Cap Infinity (enterprise plan) to INT_MAX since SQL INT cannot hold Infinity.
    const sqlLimit = isFinite(includedLimit) ? includedLimit : 2147483647;
    const { data, error } = await this.client
      .rpc('deduct_otto_question', { p_user_id: userId, p_included_limit: sqlLimit });

    if (error) return err(new SubscriptionRepositoryError(error.message));

    if (data === 'not_found') return err(new SubscriptionRepositoryError('Subscription not found'));
    if (data === 'no_balance') return err(new SubscriptionRepositoryError('No Otto questions remaining'));

    return ok(undefined);
  }

  async addOttoPurchasedQuestions(userId: string, count: number): Promise<Result<void, SubscriptionRepositoryError>> {
    const subResult = await this.findByUserId(userId);
    if (subResult.isErr()) return err(subResult.error);
    const sub = subResult.value;

    const current = sub?.ottoPurchased ?? 0;
    const { error } = await this.client
      .from('subscriptions')
      .upsert({ user_id: userId, otto_purchased: current + count, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

    if (error) return err(new SubscriptionRepositoryError(error.message));
    return ok(undefined);
  }

  async addVerificationsPurchased(userId: string, count: number): Promise<Result<void, SubscriptionRepositoryError>> {
    const subResult = await this.findByUserId(userId);
    if (subResult.isErr()) return err(subResult.error);
    const sub = subResult.value;

    const current = sub?.verificationsPurchased ?? 0;
    const { error } = await this.client
      .from('subscriptions')
      .upsert({ user_id: userId, verifications_purchased: current + count, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

    if (error) return err(new SubscriptionRepositoryError(error.message));
    return ok(undefined);
  }

  async resetOttoIncludedUsed(userId: string): Promise<Result<void, SubscriptionRepositoryError>> {
    const { error } = await this.client
      .from('subscriptions')
      .update({ otto_included_used: 0, otto_included_reset_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (error) return err(new SubscriptionRepositoryError(error.message));
    return ok(undefined);
  }

  async resetAllOttoIncludedUsed(): Promise<Result<void, SubscriptionRepositoryError>> {
    const { error } = await this.client
      .from('subscriptions')
      .update({ otto_included_used: 0, otto_included_reset_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .neq('plan', 'free');

    if (error) return err(new SubscriptionRepositoryError(error.message));
    return ok(undefined);
  }

  async setAdminOverride(userId: string, override: boolean): Promise<Result<void, SubscriptionRepositoryError>> {
    const { error } = await this.client
      .from('subscriptions')
      .update({ admin_override: override, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (error) return err(new SubscriptionRepositoryError(error.message));
    return ok(undefined);
  }
}
