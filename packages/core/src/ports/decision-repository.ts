import { Result } from 'neverthrow';
import type { Decision } from '../domain/decision';

export class DecisionRepositoryError extends Error {
  readonly code = 'DECISION_REPOSITORY_ERROR' as const;
}

export interface IDecisionRepository {
  save(decision: Decision): Promise<Result<Decision, DecisionRepositoryError>>;
  findByIdeaId(ideaId: string): Promise<Result<Decision | null, DecisionRepositoryError>>;
  findAllByIdeaId(ideaId: string): Promise<Result<Decision[], DecisionRepositoryError>>;
}
