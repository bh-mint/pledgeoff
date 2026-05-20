import { Result } from 'neverthrow';
import type { ApiKey } from '../domain/api-key';
import type { IApiKeyRepository } from '../ports/IApiKeyRepository';

export type ListApiKeysInput = {
  userId: string;
  traceId: string;
};

export class ListApiKeysUseCase {
  constructor(private readonly apiKeyRepo: IApiKeyRepository) {}

  async execute(input: ListApiKeysInput): Promise<Result<ApiKey[], Error>> {
    return this.apiKeyRepo.listByUser(input.userId);
  }
}
