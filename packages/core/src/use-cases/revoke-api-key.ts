import { Result, ok, err } from 'neverthrow';
import { ApiKeyNotFoundError, ApiKeyForbiddenError } from '../domain/api-key';
import type { IApiKeyRepository } from '../ports/IApiKeyRepository';

export type RevokeApiKeyInput = {
  id: string;
  userId: string;
  traceId: string;
};

export type RevokeApiKeyError = ApiKeyNotFoundError | ApiKeyForbiddenError | Error;

export class RevokeApiKeyUseCase {
  constructor(private readonly apiKeyRepo: IApiKeyRepository) {}

  async execute(input: RevokeApiKeyInput): Promise<Result<void, RevokeApiKeyError>> {
    const listResult = await this.apiKeyRepo.listByUser(input.userId);
    if (listResult.isErr()) return err(listResult.error);

    const key = listResult.value.find((k) => k.id === input.id);
    if (!key) return err(new ApiKeyNotFoundError());
    if (key.userId !== input.userId) return err(new ApiKeyForbiddenError());
    if (key.revokedAt !== null) return ok(undefined);

    return this.apiKeyRepo.revoke(input.id, input.userId);
  }
}
