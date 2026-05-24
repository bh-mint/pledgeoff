import { Result } from 'neverthrow';
import { DecisionOutcome } from '../domain/decision-outcome.js';

export class DecisionOutcomeRepositoryError extends Error {
  readonly code = 'DECISION_OUTCOME_REPOSITORY_ERROR';
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
  }
}

export interface IDecisionOutcomeRepository {
  upsert(outcome: DecisionOutcome): Promise<Result<DecisionOutcome, DecisionOutcomeRepositoryError>>;
  findByIdea(ideaId: string): Promise<Result<DecisionOutcome | null, DecisionOutcomeRepositoryError>>;
  findByUser(userId: string): Promise<Result<DecisionOutcome[], DecisionOutcomeRepositoryError>>;
  findAll(): Promise<Result<DecisionOutcome[], DecisionOutcomeRepositoryError>>;
}
