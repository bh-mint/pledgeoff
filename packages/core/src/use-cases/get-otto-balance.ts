import { err, ok, Result } from 'neverthrow';
import { effectivePlan, ottoAvailableQuestions, PLAN_LIMITS } from '../domain/subscription';
import type { ISubscriptionRepository, SubscriptionRepositoryError } from '../ports/subscription-repository';

export type GetOttoBalanceOutput = {
  included: number;
  purchased: number;
  total: number;
  includedLimit: number;
  plan: string;
};

export class GetOttoBalanceUseCase {
  constructor(private readonly subscriptionRepo: ISubscriptionRepository) {}

  async execute(userId: string): Promise<Result<GetOttoBalanceOutput, SubscriptionRepositoryError>> {
    const result = await this.subscriptionRepo.findByUserId(userId);
    if (result.isErr()) return err(result.error);

    const sub = result.value;
    if (!sub) {
      return ok({ included: 0, purchased: 0, total: 0, includedLimit: 0, plan: 'free' });
    }

    const plan = effectivePlan(sub);
    const balance = ottoAvailableQuestions(sub);
    const includedLimit = PLAN_LIMITS[plan].ottoQuestionsPerMonth;

    return ok({ ...balance, includedLimit, plan });
  }
}
