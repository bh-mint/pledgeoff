import { Result } from 'neverthrow';
import type { Feedback } from '../domain/feedback';

export class FeedbackRepositoryError extends Error {
  readonly code = 'FEEDBACK_REPOSITORY_ERROR' as const;
}

export interface IFeedbackRepository {
  save(feedback: Feedback): Promise<Result<Feedback, FeedbackRepositoryError>>;
  findByDecisionId(decisionId: string): Promise<Result<Feedback[], FeedbackRepositoryError>>;
}
