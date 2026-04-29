import { Result } from 'neverthrow';
import type { Idea } from '../domain/idea';

export class IdeaRepositoryError extends Error {
  readonly code = 'IDEA_REPOSITORY_ERROR' as const;
}

export interface IIdeaRepository {
  save(idea: Idea): Promise<Result<Idea, IdeaRepositoryError>>;
  findById(id: string): Promise<Result<Idea | null, IdeaRepositoryError>>;
  findByUserId(userId: string): Promise<Result<Idea[], IdeaRepositoryError>>;
}
