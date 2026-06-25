import type { Result } from 'neverthrow';
import type { Battlecard } from '../domain/battlecard';

export class BattlecardRepositoryError extends Error {
  readonly code = 'BATTLECARD_REPO_ERROR' as const;
}

export interface IBattlecardRepository {
  save(battlecard: Battlecard): Promise<Result<Battlecard, BattlecardRepositoryError>>;
  findByIdeaId(ideaId: string): Promise<Result<Battlecard | null, BattlecardRepositoryError>>;
}
