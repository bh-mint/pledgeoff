import { Result, ok, err } from 'neverthrow';
import {
  ApiKey,
  ApiKeyNameInvalidError,
  ApiKeyLimitReachedError,
  canCreateApiKey,
  validateApiKeyName,
} from '../domain/api-key';
import type { IApiKeyRepository } from '../ports/IApiKeyRepository';

export type GenerateApiKeyInput = {
  userId: string;
  name: string;
  traceId: string;
};

export type GenerateApiKeyOutput = {
  apiKey: ApiKey;
  plaintext: string; // shown once, never stored
};

export type GenerateApiKeyError =
  | ApiKeyNameInvalidError
  | ApiKeyLimitReachedError
  | Error;

export class GenerateApiKeyUseCase {
  constructor(private readonly apiKeyRepo: IApiKeyRepository) {}

  async execute(input: GenerateApiKeyInput): Promise<Result<GenerateApiKeyOutput, GenerateApiKeyError>> {
    const nameResult = validateApiKeyName(input.name);
    if (nameResult.isErr()) return err(nameResult.error);

    const countResult = await this.apiKeyRepo.countActiveByUser(input.userId);
    if (countResult.isErr()) return err(countResult.error);

    const limitResult = canCreateApiKey(countResult.value);
    if (limitResult.isErr()) return err(limitResult.error);

    const plaintext = generateSecureKey();
    const keyHash = await hashKey(plaintext);
    const keyPrefix = plaintext.slice(0, 16);

    const createResult = await this.apiKeyRepo.create({
      userId: input.userId,
      name: nameResult.value,
      keyHash,
      keyPrefix,
    });

    if (createResult.isErr()) return err(createResult.error);

    return ok({ apiKey: createResult.value, plaintext });
  }
}

function generateSecureKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  return `po_live_${hex}`;
}

async function hashKey(plaintext: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
