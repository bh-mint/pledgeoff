import type { Result } from 'neverthrow';
import type { Subscription, Plan, SubscriptionStatus } from '../domain/subscription';

export class SubscriptionRepositoryError extends Error {
  readonly code = 'SUBSCRIPTION_REPOSITORY_ERROR' as const;
  constructor(cause: unknown) {
    super('Subscription repository error');
    this.cause = cause;
  }
}

export class VerificationsExhaustedError extends Error {
  readonly code = 'VERIFICATIONS_EXHAUSTED' as const;
  constructor() {
    super('No verifications remaining');
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

export type SubscriptionSeatUpdateInput = {
  userId: string;
  extraSeats: number;
  stripeExtraSeatItemId: string | null;
};

export type SubscriptionPlanUpdateInput = {
  userId: string;
  plan: Plan;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
};

export interface ISubscriptionRepository {
  findByUserId(userId: string): Promise<Result<Subscription | null, SubscriptionRepositoryError>>;
  findByStripeCustomerId(customerId: string): Promise<Result<Subscription | null, SubscriptionRepositoryError>>;
  findByStripeSubscriptionId(subscriptionId: string): Promise<Result<Subscription | null, SubscriptionRepositoryError>>;
  findPastDueForRetry(): Promise<Result<Subscription[], SubscriptionRepositoryError>>;
  upsert(input: SubscriptionUpsertInput): Promise<Result<Subscription, SubscriptionRepositoryError>>;
  updatePlan(input: SubscriptionPlanUpdateInput): Promise<Result<Subscription, SubscriptionRepositoryError>>;
  updateExtraSeats(input: SubscriptionSeatUpdateInput): Promise<Result<Subscription, SubscriptionRepositoryError>>;
  setPastDueSince(userId: string, since: string): Promise<Result<void, SubscriptionRepositoryError>>;
  downgradeToFree(userId: string): Promise<Result<void, SubscriptionRepositoryError>>;
  deductOttoQuestion(userId: string): Promise<Result<void, SubscriptionRepositoryError>>;
  /** Atomically checks monthly quota and deducts 1 from verifications_purchased when included is exhausted. */
  deductVerification(userId: string): Promise<Result<void, SubscriptionRepositoryError | VerificationsExhaustedError>>;
  addOttoPurchasedQuestions(userId: string, count: number): Promise<Result<void, SubscriptionRepositoryError>>;
  addVerificationsPurchased(userId: string, count: number): Promise<Result<void, SubscriptionRepositoryError>>;
  resetOttoIncludedUsed(userId: string): Promise<Result<void, SubscriptionRepositoryError>>;
  resetAllOttoIncludedUsed(): Promise<Result<void, SubscriptionRepositoryError>>;
  setAdminOverride(userId: string, override: boolean): Promise<Result<void, SubscriptionRepositoryError>>;
}
