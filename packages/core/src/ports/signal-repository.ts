import { Result } from 'neverthrow';
import type { Signal } from '../domain/signal';

export class SignalRepositoryError extends Error {
  readonly code = 'SIGNAL_REPOSITORY_ERROR' as const;
}

export interface ISignalRepository {
  upsertMany(signals: Signal[]): Promise<Result<Signal[], SignalRepositoryError>>;
  findByIdeaId(ideaId: string): Promise<Result<Signal[], SignalRepositoryError>>;
  findTopByEmbedding(embedding: number[], ideaId: string, limit: number): Promise<Result<Signal[], SignalRepositoryError>>;
  saveEmbeddings(entries: Array<{ id: string; embedding: number[] }>): Promise<Result<void, SignalRepositoryError>>;
}
