import { Result } from 'neverthrow';
import type { DecisionQueueEntry } from '../domain/decision-queue';

export class DecisionQueueRepositoryError extends Error {
  readonly code = 'DECISION_QUEUE_REPOSITORY_ERROR' as const;
}

export interface IDecisionQueueRepository {
  upsert(entry: DecisionQueueEntry): Promise<Result<DecisionQueueEntry, DecisionQueueRepositoryError>>;
  findByUserId(userId: string): Promise<Result<DecisionQueueEntry[], DecisionQueueRepositoryError>>;
  findByIdeaId(ideaId: string): Promise<Result<DecisionQueueEntry | null, DecisionQueueRepositoryError>>;
}
