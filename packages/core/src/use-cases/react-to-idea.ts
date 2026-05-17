import { Result, ok, err } from 'neverthrow';
import { createIdeaReaction, type ReactionType } from '../domain/idea-reaction';
import type { IdeaReaction } from '../domain/idea-reaction';
import type { IIdeaReactionRepository, IdeaReactionRepositoryError } from '../ports/idea-reaction-repository';

export type ReactToIdeaInput = {
  userId: string;
  ideaId: string;
  reaction: ReactionType | null;
};

export type ReactToIdeaResult = {
  reaction: IdeaReaction | null;
};

export type ReactToIdeaError = IdeaReactionRepositoryError;

export class ReactToIdeaUseCase {
  constructor(private readonly reactionRepo: IIdeaReactionRepository) {}

  async execute(input: ReactToIdeaInput): Promise<Result<ReactToIdeaResult, ReactToIdeaError>> {
    if (input.reaction === null) {
      const deleteResult = await this.reactionRepo.delete(input.ideaId, input.userId);
      if (deleteResult.isErr()) return err(deleteResult.error);
      return ok({ reaction: null });
    }

    const entry = createIdeaReaction({
      ideaId: input.ideaId,
      userId: input.userId,
      reaction: input.reaction,
    });

    const upsertResult = await this.reactionRepo.upsert(entry);
    if (upsertResult.isErr()) return err(upsertResult.error);
    return ok({ reaction: upsertResult.value });
  }
}
