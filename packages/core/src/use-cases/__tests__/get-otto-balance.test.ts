import { describe, it, expect, vi } from 'vitest';
import { ok, err } from 'neverthrow';
import { GetOttoBalanceUseCase } from '../get-otto-balance';
import type { ISubscriptionRepository } from '../../ports/subscription-repository';
import { SubscriptionRepositoryError } from '../../ports/subscription-repository';
import type { Subscription } from '../../domain/subscription';

const makeSub = (overrides: Partial<Subscription> = {}): Subscription => ({
  id: 'sub-1',
  userId: 'user-1',
  stripeCustomerId: 'cus_1',
  stripeSubscriptionId: 'sub_stripe_1',
  plan: 'pro',
  status: 'active',
  currentPeriodEnd: null,
  extraSeats: 0,
  stripeExtraSeatItemId: null,
  pastDueSince: null,
  ottoIncludedUsed: 1,
  ottoIncludedResetAt: null,
  ottoPurchased: 5,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

function makeRepo(sub: Subscription | null = makeSub()): ISubscriptionRepository {
  return {
    findByUserId: vi.fn().mockResolvedValue(ok(sub)),
    findByStripeCustomerId: vi.fn(),
    findByStripeSubscriptionId: vi.fn(),
    findPastDueForRetry: vi.fn(),
    upsert: vi.fn(),
    updatePlan: vi.fn(),
    updateExtraSeats: vi.fn(),
    setPastDueSince: vi.fn(),
    downgradeToFree: vi.fn(),
    deductOttoQuestion: vi.fn(),
    addOttoPurchasedQuestions: vi.fn(),
    resetOttoIncludedUsed: vi.fn(),
    resetAllOttoIncludedUsed: vi.fn(),
  };
}

describe('GetOttoBalanceUseCase', () => {
  it('returns correct balance for Pro user with 1 used and 5 purchased', async () => {
    const repo = makeRepo();
    const useCase = new GetOttoBalanceUseCase(repo);

    const result = await useCase.execute('user-1');

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.included).toBe(4); // 5 limit - 1 used
      expect(result.value.purchased).toBe(5);
      expect(result.value.total).toBe(9);
      expect(result.value.includedLimit).toBe(5);
      expect(result.value.plan).toBe('pro');
    }
  });

  it('returns zero balance for Free user (no subscription row)', async () => {
    const repo = makeRepo(null);
    const useCase = new GetOttoBalanceUseCase(repo);

    const result = await useCase.execute('user-1');

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.total).toBe(0);
      expect(result.value.plan).toBe('free');
    }
  });

  it('returns 10 included for Pro+ with none used', async () => {
    const repo = makeRepo(makeSub({ plan: 'pro_plus', ottoIncludedUsed: 0, ottoPurchased: 0 }));
    const useCase = new GetOttoBalanceUseCase(repo);

    const result = await useCase.execute('user-1');

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.included).toBe(15);
      expect(result.value.includedLimit).toBe(15);
    }
  });

  it('propagates repository errors', async () => {
    const repo = makeRepo();
    vi.mocked(repo.findByUserId).mockResolvedValueOnce(err(new SubscriptionRepositoryError('DB down')));
    const useCase = new GetOttoBalanceUseCase(repo);

    const result = await useCase.execute('user-1');

    expect(result.isErr()).toBe(true);
  });
});
