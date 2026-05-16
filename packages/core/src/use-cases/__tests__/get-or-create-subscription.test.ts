import { describe, it, expect } from 'vitest';
import { ok, err } from 'neverthrow';
import { GetOrCreateSubscriptionUseCase } from '../get-or-create-subscription';
import { SubscriptionRepositoryError } from '../../ports/subscription-repository';
import type { ISubscriptionRepository, SubscriptionUpsertInput } from '../../ports/subscription-repository';
import type { Subscription } from '../../domain/subscription';

const userId = crypto.randomUUID();

const makeSubscription = (overrides: Partial<Subscription> = {}): Subscription => ({
  id: crypto.randomUUID(),
  userId,
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  plan: 'free',
  status: 'active',
  currentPeriodEnd: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

function makeMockRepo(overrides: Partial<ISubscriptionRepository> = {}): ISubscriptionRepository {
  return {
    findByUserId: async () => ok(null),
    findByStripeCustomerId: async () => ok(null),
    findByStripeSubscriptionId: async () => ok(null),
    upsert: async (input: SubscriptionUpsertInput) =>
      ok(makeSubscription({ userId: input.userId, plan: input.plan ?? 'free' })),
    ...overrides,
  };
}

describe('GetOrCreateSubscriptionUseCase', () => {
  it('returns existing subscription when found', async () => {
    const existing = makeSubscription({ plan: 'pro' });
    const repo = makeMockRepo({ findByUserId: async () => ok(existing) });
    const useCase = new GetOrCreateSubscriptionUseCase(repo);

    const result = await useCase.execute({ userId });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual(existing);
  });

  it('creates a free subscription when none exists', async () => {
    let upsertCalled = false;
    const repo = makeMockRepo({
      upsert: async (input) => {
        upsertCalled = true;
        expect(input.plan).toBe('free');
        expect(input.status).toBe('active');
        return ok(makeSubscription({ userId: input.userId }));
      },
    });
    const useCase = new GetOrCreateSubscriptionUseCase(repo);

    const result = await useCase.execute({ userId });

    expect(result.isOk()).toBe(true);
    expect(upsertCalled).toBe(true);
    expect(result._unsafeUnwrap().plan).toBe('free');
  });

  it('propagates repository error on findByUserId failure', async () => {
    const repoError = new SubscriptionRepositoryError('DB down');
    const repo = makeMockRepo({ findByUserId: async () => err(repoError) });
    const useCase = new GetOrCreateSubscriptionUseCase(repo);

    const result = await useCase.execute({ userId });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBe(repoError);
  });

  it('propagates repository error on upsert failure', async () => {
    const repoError = new SubscriptionRepositoryError('Upsert failed');
    const repo = makeMockRepo({ upsert: async () => err(repoError) });
    const useCase = new GetOrCreateSubscriptionUseCase(repo);

    const result = await useCase.execute({ userId });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBe(repoError);
  });
});
