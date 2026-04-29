import { Result } from 'neverthrow';

export class IdempotencyStoreError extends Error {
  readonly code = 'IDEMPOTENCY_STORE_ERROR' as const;
}

export interface IIdempotencyStore {
  hasBeenProcessed(eventId: string): Promise<Result<boolean, IdempotencyStoreError>>;
  markAsProcessed(eventId: string): Promise<Result<void, IdempotencyStoreError>>;
}
