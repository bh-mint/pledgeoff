import type { Result } from 'neverthrow';
import type { EngineeringSnapshot } from '../domain/engineering-snapshot';

export class EngineeringSnapshotRepositoryError extends Error {
  readonly code = 'ENGINEERING_SNAPSHOT_REPOSITORY_ERROR' as const;
  constructor(message: string) {
    super(message);
    this.name = 'EngineeringSnapshotRepositoryError';
  }
}

export interface IEngineeringSnapshotRepository {
  save(snapshot: EngineeringSnapshot, plainToken: string): Promise<Result<EngineeringSnapshot, EngineeringSnapshotRepositoryError>>;
  findByUserId(userId: string): Promise<Result<EngineeringSnapshot | null, EngineeringSnapshotRepositoryError>>;
  findAllWithTokens(): Promise<Result<Array<{ snapshot: EngineeringSnapshot; plainToken: string }>, EngineeringSnapshotRepositoryError>>;
  deleteByUserId(userId: string): Promise<Result<void, EngineeringSnapshotRepositoryError>>;
}
