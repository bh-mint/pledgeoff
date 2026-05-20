import { z } from 'zod';
import { Result, ok, err } from 'neverthrow';

export const ApiKeySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1).max(64),
  keyHash: z.string(),
  keyPrefix: z.string(),
  createdAt: z.string().datetime(),
  lastUsedAt: z.string().datetime().nullable(),
  revokedAt: z.string().datetime().nullable(),
});

export type ApiKey = z.infer<typeof ApiKeySchema>;

export class ApiKeyNameInvalidError extends Error {
  readonly code = 'API_KEY_NAME_INVALID';
}

export class ApiKeyLimitReachedError extends Error {
  readonly code = 'API_KEY_LIMIT_REACHED';
}

export class ApiKeyNotFoundError extends Error {
  readonly code = 'API_KEY_NOT_FOUND';
}

export class ApiKeyForbiddenError extends Error {
  readonly code = 'API_KEY_FORBIDDEN';
}

const MAX_KEYS_PER_USER = 10;

export function validateApiKeyName(name: string): Result<string, ApiKeyNameInvalidError> {
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 64) {
    return err(new ApiKeyNameInvalidError('Name must be 1–64 characters'));
  }
  return ok(trimmed);
}

export function canCreateApiKey(existingCount: number): Result<true, ApiKeyLimitReachedError> {
  if (existingCount >= MAX_KEYS_PER_USER) {
    return err(new ApiKeyLimitReachedError(`Maximum ${MAX_KEYS_PER_USER} API keys per user`));
  }
  return ok(true);
}
