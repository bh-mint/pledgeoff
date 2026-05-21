import { Result } from 'neverthrow';
import type { LaunchKit } from '../domain/launch-kit';

export class LaunchKitRepositoryError extends Error {
  readonly code = 'LAUNCH_KIT_REPOSITORY_ERROR' as const;
}

export interface ILaunchKitRepository {
  save(kit: LaunchKit): Promise<Result<LaunchKit, LaunchKitRepositoryError>>;
  findByIdeaId(ideaId: string): Promise<Result<LaunchKit | null, LaunchKitRepositoryError>>;
}
