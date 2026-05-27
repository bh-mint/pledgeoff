import { Result } from 'neverthrow';
import type { Idea } from '../domain/idea';

export class IdeaRepositoryError extends Error {
  readonly code = 'IDEA_REPOSITORY_ERROR' as const;
}

export type IdeasPage = {
  ideas: Idea[];
  hasMore: boolean;
  nextCursor: string | null;
};

export const IDEAS_PAGE_MAX_LIMIT = 100;

export interface IIdeaRepository {
  save(idea: Idea): Promise<Result<Idea, IdeaRepositoryError>>;
  /** Atomically inserts idea + outbox event in one DB transaction. Preferred over save() + eventBus.publish(). */
  saveWithEvent(
    idea: Idea,
    event: { eventId: string; eventType: string; payload: unknown },
  ): Promise<Result<Idea, IdeaRepositoryError>>;
  findById(id: string): Promise<Result<Idea | null, IdeaRepositoryError>>;
  findByUserId(userId: string): Promise<Result<Idea[], IdeaRepositoryError>>;
  findByUserIds(userIds: string[]): Promise<Result<Idea[], IdeaRepositoryError>>;
  findByUserIdPaginated(userId: string, limit: number, cursor?: string): Promise<Result<IdeasPage, IdeaRepositoryError>>;
  countThisMonth(userId: string): Promise<Result<number, IdeaRepositoryError>>;
}
