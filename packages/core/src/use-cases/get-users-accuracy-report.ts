import { Result, err, ok } from 'neverthrow';
import { calculateAccuracy, FlywheelStats } from '../domain/decision-outcome';
import type { IDecisionOutcomeRepository, DecisionOutcomeRepositoryError } from '../ports/decision-outcome-repository';

export type UserAccuracyReport = {
  readonly userId: string;
  readonly stats: FlywheelStats;
};

export type GetUsersAccuracyReportError = DecisionOutcomeRepositoryError;

const MIN_OUTCOMES_FOR_REPORT = 3;

export class GetUsersAccuracyReportUseCase {
  constructor(private readonly outcomeRepo: IDecisionOutcomeRepository) {}

  async execute(): Promise<Result<UserAccuracyReport[], GetUsersAccuracyReportError>> {
    const result = await this.outcomeRepo.findAll();
    if (result.isErr()) return err(result.error);

    const byUser = new Map<string, typeof result.value>();
    for (const outcome of result.value) {
      const list = byUser.get(outcome.userId) ?? [];
      list.push(outcome);
      byUser.set(outcome.userId, list);
    }

    const reports: UserAccuracyReport[] = [];
    for (const [userId, outcomes] of byUser.entries()) {
      if (outcomes.length < MIN_OUTCOMES_FOR_REPORT) continue;
      reports.push({ userId, stats: calculateAccuracy(outcomes) });
    }

    return ok(reports);
  }
}
