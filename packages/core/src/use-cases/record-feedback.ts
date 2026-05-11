import { Result, err, ok } from 'neverthrow';
import type { Feedback, FeedbackVote } from '../domain/feedback';
import type { IFeedbackRepository, FeedbackRepositoryError } from '../ports/feedback-repository';

export interface RecordFeedbackInput {
  readonly ideaId: string;
  readonly decisionId: string;
  readonly userId: string;
  readonly vote: FeedbackVote;
  readonly comment?: string;
  readonly traceId: string;
}

export type RecordFeedbackError = FeedbackRepositoryError;

export class RecordFeedbackUseCase {
  constructor(private readonly feedbackRepo: IFeedbackRepository) {}

  async execute(input: RecordFeedbackInput): Promise<Result<Feedback, RecordFeedbackError>> {
    const feedback: Feedback = {
      id: crypto.randomUUID(),
      ideaId: input.ideaId,
      decisionId: input.decisionId,
      userId: input.userId,
      vote: input.vote,
      ...(input.comment ? { comment: input.comment } : {}),
      createdAt: new Date().toISOString(),
    };

    const saveResult = await this.feedbackRepo.save(feedback);
    if (saveResult.isErr()) return err(saveResult.error);

    return ok(saveResult.value);
  }
}
