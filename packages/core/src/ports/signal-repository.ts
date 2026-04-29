import { Result } from 'neverthrow';
import type { Signal } from '../domain/signal.js';

export class SignalRepositoryError extends Error {
  readonly code = 'SIGNAL_REPOSITORY_ERROR' as const;
}

export interface ISignalRepository {
  upsertMany(signals: Signal[]): Promise<Result<Signal[], SignalRepositoryError>>;
  findByIdeaId(ideaId: string): Promise<Result<Signal[], SignalRepositoryError>>;
}
