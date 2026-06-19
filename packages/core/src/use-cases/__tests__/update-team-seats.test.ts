import { describe, it, expect } from 'vitest';
import { ok, err } from 'neverthrow';
import { UpdateTeamSeatsUseCase, TeamSeatsPlanError, TeamSeatsQuantityError } from '../update-team-seats';
import { SubscriptionRepositoryError } from '../../ports/subscription-repository';
import type { ISubscriptionRepository, SubscriptionSeatUpdateInput } from '../../ports/subscription-repository';
import type { Subscription } from '../../domain/subscription';

function makeSub(override?: Partial<Subscription>): Subscription {
  return {
    id: 'sub-1', userId: 'user-1',
    stripeCustomerId: 'cus_1', stripeSubscriptionId: 'sub_stripe_1',
    plan: 'team', status: 'active',
    currentPeriodEnd: null, extraSeats: 0, stripeExtraSeatItemId: null,
    pastDueSince: null,
    ottoIncludedUsed: 0, ottoIncludedResetAt: null, ottoPurchased: 0, verificationsPurchased: 0,
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    ...override,
  };
}

function mockRepo(overrides?: Partial<ISubscriptionRepository>): ISubscriptionRepository {
  return {
    findByUserId: async () => ok(null),
    findByStripeCustomerId: async () => ok(null),
    findByStripeSubscriptionId: async () => ok(null),
    findPastDueForRetry: async () => ok([]),
    upsert: async (input) => ok(makeSub({ userId: input.userId })),
    updatePlan: async (input) => ok(makeSub({ userId: input.userId })),
    updateExtraSeats: async (input: SubscriptionSeatUpdateInput) => ok(makeSub({ userId: input.userId, extraSeats: input.extraSeats })),
    setPastDueSince: async () => ok(undefined),
    downgradeToFree: async () => ok(undefined),
    deductOttoQuestion: async () => ok(undefined),
    deductVerification: async () => ok(undefined),
    addOttoPurchasedQuestions: async () => ok(undefined),
    addVerificationsPurchased: async () => ok(undefined),
    resetOttoIncludedUsed: async () => ok(undefined),
    resetAllOttoIncludedUsed: async () => ok(undefined),
    ...overrides,
  };
}

describe('UpdateTeamSeatsUseCase', () => {
  const baseInput = { userId: 'user-1', extraSeats: 2, traceId: 'trace-1' };

  it('returns context with subscription and commitSeats for valid Pro+ user', async () => {
    const sub = makeSub();
    const repo = mockRepo({ findByUserId: async () => ok(sub) });
    const useCase = new UpdateTeamSeatsUseCase(repo);
    const result = await useCase.execute(baseInput);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().subscription).toEqual(sub);
    expect(typeof result._unsafeUnwrap().commitSeats).toBe('function');
  });

  it('commitSeats persists extra_seats to repository', async () => {
    const sub = makeSub();
    const captured = { input: null as SubscriptionSeatUpdateInput | null };
    const repo = mockRepo({
      findByUserId: async () => ok(sub),
      updateExtraSeats: async (input) => { captured.input = input; return ok(makeSub({ extraSeats: input.extraSeats })); },
    });

    const useCase = new UpdateTeamSeatsUseCase(repo);
    const ctx = (await useCase.execute(baseInput))._unsafeUnwrap();
    await ctx.commitSeats('si_abc123');

    expect(captured.input?.extraSeats).toBe(2);
    expect(captured.input?.stripeExtraSeatItemId).toBe('si_abc123');
  });

  it('rejects when user has no Pro+ subscription', async () => {
    const sub = makeSub({ plan: 'founder' });
    const repo = mockRepo({ findByUserId: async () => ok(sub) });
    const useCase = new UpdateTeamSeatsUseCase(repo);
    const result = await useCase.execute(baseInput);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(TeamSeatsPlanError);
  });

  it('allows seat update when subscription is past_due (grace period active)', async () => {
    const sub = makeSub({ status: 'past_due', plan: 'team' });
    const repo = mockRepo({ findByUserId: async () => ok(sub) });
    const useCase = new UpdateTeamSeatsUseCase(repo);
    const result = await useCase.execute(baseInput);

    // past_due is included in isActivePlan — grace period of 24h applies
    expect(result.isOk()).toBe(true);
  });

  it('rejects when user has no subscription at all', async () => {
    const repo = mockRepo({ findByUserId: async () => ok(null) });
    const useCase = new UpdateTeamSeatsUseCase(repo);
    const result = await useCase.execute(baseInput);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(TeamSeatsPlanError);
  });

  it('rejects negative extra seats', async () => {
    const repo = mockRepo();
    const useCase = new UpdateTeamSeatsUseCase(repo);
    const result = await useCase.execute({ ...baseInput, extraSeats: -1 });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(TeamSeatsQuantityError);
  });

  it('rejects more than 97 extra seats', async () => {
    const repo = mockRepo();
    const useCase = new UpdateTeamSeatsUseCase(repo);
    const result = await useCase.execute({ ...baseInput, extraSeats: 98 });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(TeamSeatsQuantityError);
  });

  it('propagates repository error', async () => {
    const repoError = new SubscriptionRepositoryError('DB error');
    const repo = mockRepo({ findByUserId: async () => err(repoError) });
    const useCase = new UpdateTeamSeatsUseCase(repo);
    const result = await useCase.execute(baseInput);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(SubscriptionRepositoryError);
  });
});
