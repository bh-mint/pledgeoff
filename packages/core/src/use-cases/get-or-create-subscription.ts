import { Result, ok, err } from 'neverthrow';
import type { ISubscriptionRepository, SubscriptionRepositoryError } from '../ports/subscription-repository';
import type { Subscription } from '../domain/subscription';

export type GetOrCreateSubscriptionInput = {
  userId: string;
};

export type GetOrCreateSubscriptionError = SubscriptionRepositoryError;

export class GetOrCreateSubscriptionUseCase {
  constructor(private readonly subscriptionRepo: ISubscriptionRepository) {}

  async execute(
    input: GetOrCreateSubscriptionInput,
  ): Promise<Result<Subscription, GetOrCreateSubscriptionError>> {
    const existing = await this.subscriptionRepo.findByUserId(input.userId);
    if (existing.isErr()) return err(existing.error);
    if (existing.value) return ok(existing.value);

    // First time: create a free subscription record
    return this.subscriptionRepo.upsert({ userId: input.userId, plan: 'free', status: 'active' });
  }
}
