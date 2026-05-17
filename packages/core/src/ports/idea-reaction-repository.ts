import type { Result } from 'neverthrow';
import type { IdeaReaction, ReactionType } from '../domain/idea-reaction';

export class IdeaReactionRepositoryError extends Error {
  readonly code = 'IDEA_REACTION_REPOSITORY_ERROR' as const;
}

export interface IIdeaReactionRepository {
  upsert(entry: IdeaReaction): Promise<Result<IdeaReaction, IdeaReactionRepositoryError>>;
  delete(ideaId: string, userId: string): Promise<Result<void, IdeaReactionRepositoryError>>;
  findByIdeaIds(ideaIds: string[]): Promise<Result<IdeaReaction[], IdeaReactionRepositoryError>>;
  findByIdeaIdAndUserId(ideaId: string, userId: string): Promise<Result<IdeaReaction | null, IdeaReactionRepositoryError>>;
  countByIdeaId(ideaId: string, reaction: ReactionType): Promise<Result<number, IdeaReactionRepositoryError>>;
}
