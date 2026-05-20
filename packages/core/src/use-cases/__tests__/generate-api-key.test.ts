import { describe, it, expect, vi } from 'vitest';
import { ok, err } from 'neverthrow';
import { GenerateApiKeyUseCase } from '../generate-api-key';
import { ApiKeyLimitReachedError, ApiKeyNameInvalidError } from '../../domain/api-key';
import type { IApiKeyRepository } from '../../ports/IApiKeyRepository';
import type { ApiKey } from '../../domain/api-key';

function makeRepo(overrides: Partial<IApiKeyRepository> = {}): IApiKeyRepository {
  return {
    create: vi.fn().mockResolvedValue(ok({
      id: 'key-id',
      userId: 'user-1',
      name: 'My key',
      keyHash: 'hash',
      keyPrefix: 'po_live_abcd12',
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      revokedAt: null,
    } satisfies ApiKey)),
    listByUser: vi.fn().mockResolvedValue(ok([])),
    findByHash: vi.fn().mockResolvedValue(ok(null)),
    countActiveByUser: vi.fn().mockResolvedValue(ok(0)),
    revoke: vi.fn().mockResolvedValue(ok(undefined)),
    updateLastUsed: vi.fn().mockResolvedValue(ok(undefined)),
    ...overrides,
  };
}

describe('GenerateApiKeyUseCase', () => {
  const input = { userId: 'user-1', name: 'My key', traceId: 'trace-1' };

  it('generates a key and returns plaintext once', async () => {
    const repo = makeRepo();
    const useCase = new GenerateApiKeyUseCase(repo);
    const result = await useCase.execute(input);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    expect(result.value.plaintext).toMatch(/^po_live_[a-f0-9]{64}$/);
    expect(result.value.apiKey.id).toBe('key-id');
  });

  it('rejects a name that is empty', async () => {
    const repo = makeRepo();
    const useCase = new GenerateApiKeyUseCase(repo);
    const result = await useCase.execute({ ...input, name: '' });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(ApiKeyNameInvalidError);
  });

  it('rejects a name longer than 64 characters', async () => {
    const repo = makeRepo();
    const useCase = new GenerateApiKeyUseCase(repo);
    const result = await useCase.execute({ ...input, name: 'x'.repeat(65) });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(ApiKeyNameInvalidError);
  });

  it('rejects when user has reached the 10 key limit', async () => {
    const repo = makeRepo({ countActiveByUser: vi.fn().mockResolvedValue(ok(10)) });
    const useCase = new GenerateApiKeyUseCase(repo);
    const result = await useCase.execute(input);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(ApiKeyLimitReachedError);
  });

  it('propagates repo errors', async () => {
    const repo = makeRepo({ countActiveByUser: vi.fn().mockResolvedValue(err(new Error('db error'))) });
    const useCase = new GenerateApiKeyUseCase(repo);
    const result = await useCase.execute(input);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe('db error');
  });
});
