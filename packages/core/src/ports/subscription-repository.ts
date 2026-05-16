import type { Result } from 'neverthrow';
import type { Subscription, Plan, SubscriptionStatus } from '../domain/subscription';

export class SubscriptionRepositoryError extends Error {
  readonly code = 'SUBSCRIPTION_REPOSITORY_ERROR' as const;
  constructor(cause: unknown) {
    super('Subscription repository error');
    this.cause = cause;
  }
}

export type SubscriptionUpsertInput = {
  userId: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  plan?: Plan;
  status?: SubscriptionStatus;
  currentPeriodEnd?: string | null;
};

export interface ISubscriptionRepository {
  findByUserId(userId: string): Promise<Result<Subscription | null, SubscriptionRepositoryError>>;
  findByStripeCustomerId(customerId: string): Promise<Result<Subscription | null, SubscriptionRepositoryError>>;
  findByStripeSubscriptionId(subscriptionId: string): Promise<Result<Subscription | null, SubscriptionRepositoryError>>;
  upsert(input: SubscriptionUpsertInput): Promise<Result<Subscription, SubscriptionRepositoryError>>;
}
