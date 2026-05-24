import { Result, err, ok } from 'neverthrow';
import { calculateAccuracy, FlywheelStats } from '../domain/decision-outcome';
import type { IDecisionOutcomeRepository, DecisionOutcomeRepositoryError } from '../ports/decision-outcome-repository';

export type GetFlywheelStatsError = DecisionOutcomeRepositoryError;

export class GetFlywheelStatsUseCase {
  constructor(private readonly outcomeRepo: IDecisionOutcomeRepository) {}

  async execute(): Promise<Result<FlywheelStats, GetFlywheelStatsError>> {
    const result = await this.outcomeRepo.findAll();
    if (result.isErr()) return err(result.error);
    return ok(calculateAccuracy(result.value));
  }
}
