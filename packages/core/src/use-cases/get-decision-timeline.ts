import { Result, ok, err } from 'neverthrow';
import type { Decision } from '../domain/decision';
import type { IDecisionRepository, DecisionRepositoryError } from '../ports/decision-repository';
import type { IFeedbackRepository, FeedbackRepositoryError } from '../ports/feedback-repository';
import { IdeaRepositoryError, type IIdeaRepository } from '../ports/idea-repository';

export type DecisionDelta = {
  readonly verdictChanged: boolean;
  readonly previousVerdict: Decision['verdict'];
  readonly confidenceDelta: number;
  readonly scoreDelta: number | null;
};

export type DecisionTimelineEntry = {
  readonly decision: Decision;
  readonly feedbackCounts: { readonly thumbsUp: number; readonly thumbsDown: number };
  readonly delta: DecisionDelta | null;
};

export type DecisionTimeline = {
  readonly ideaId: string;
  readonly entries: DecisionTimelineEntry[];
};

export type GetDecisionTimelineError =
  | IdeaRepositoryError
  | DecisionRepositoryError
  | FeedbackRepositoryError;

export interface GetDecisionTimelineInput {
  readonly ideaId: string;
  readonly userId: string;
  readonly traceId: string;
}

export class GetDecisionTimelineUseCase {
  constructor(
    private readonly ideaRepo: IIdeaRepository,
    private readonly decisionRepo: IDecisionRepository,
    private readonly feedbackRepo: IFeedbackRepository,
  ) {}

  async execute(
    input: GetDecisionTimelineInput,
  ): Promise<Result<DecisionTimeline, GetDecisionTimelineError>> {
    const ideaResult = await this.ideaRepo.findById(input.ideaId);
    if (ideaResult.isErr()) return err(ideaResult.error);
    if (!ideaResult.value || ideaResult.value.userId !== input.userId) {
      return err(new IdeaRepositoryError('Not found'));
    }

    const decisionsResult = await this.decisionRepo.findAllByIdeaId(input.ideaId);
    if (decisionsResult.isErr()) return err(decisionsResult.error);

    const decisions = decisionsResult.value;
    const entries: DecisionTimelineEntry[] = [];

    for (let i = 0; i < decisions.length; i++) {
      const decision = decisions[i]!;

      const feedbackResult = await this.feedbackRepo.findByDecisionId(decision.id);
      if (feedbackResult.isErr()) return err(feedbackResult.error);

      const feedback = feedbackResult.value;
      const thumbsUp = feedback.filter((f) => f.vote === 'thumbs_up').length;
      const thumbsDown = feedback.filter((f) => f.vote === 'thumbs_down').length;

      let delta: DecisionDelta | null = null;
      if (i > 0) {
        const prev = decisions[i - 1]!;
        delta = {
          verdictChanged: prev.verdict !== decision.verdict,
          previousVerdict: prev.verdict,
          confidenceDelta: Math.round((decision.confidence - prev.confidence) * 100) / 100,
          scoreDelta:
            decision.score != null && prev.score != null
              ? decision.score - prev.score
              : null,
        };
      }

      entries.push({ decision, feedbackCounts: { thumbsUp, thumbsDown }, delta });
    }

    return ok({ ideaId: input.ideaId, entries });
  }
}
