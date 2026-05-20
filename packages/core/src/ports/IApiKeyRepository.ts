import { Result } from 'neverthrow';
import type { ApiKey } from '../domain/api-key';

export type CreateApiKeyInput = {
  userId: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
};

export interface IApiKeyRepository {
  create(input: CreateApiKeyInput): Promise<Result<ApiKey, Error>>;
  listByUser(userId: string): Promise<Result<ApiKey[], Error>>;
  findByHash(keyHash: string): Promise<Result<ApiKey | null, Error>>;
  countActiveByUser(userId: string): Promise<Result<number, Error>>;
  revoke(id: string, userId: string): Promise<Result<void, Error>>;
  updateLastUsed(id: string): Promise<Result<void, Error>>;
}
