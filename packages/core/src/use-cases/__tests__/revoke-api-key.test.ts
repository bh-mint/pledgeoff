import { describe, it, expect, vi } from 'vitest';
import { ok, err } from 'neverthrow';
import { RevokeApiKeyUseCase } from '../revoke-api-key';
import { ApiKeyNotFoundError } from '../../domain/api-key';
import type { IApiKeyRepository } from '../../ports/IApiKeyRepository';
import type { ApiKey } from '../../domain/api-key';

const activeKey: ApiKey = {
  id: 'key-1',
  userId: 'user-1',
  name: 'Test key',
  keyHash: 'hash',
  keyPrefix: 'po_live_xxxx',
  createdAt: new Date().toISOString(),
  lastUsedAt: null,
  revokedAt: null,
};

function makeRepo(keys: ApiKey[] = [activeKey]): IApiKeyRepository {
  return {
    create: vi.fn(),
    listByUser: vi.fn().mockResolvedValue(ok(keys)),
    findByHash: vi.fn(),
    countActiveByUser: vi.fn(),
    revoke: vi.fn().mockResolvedValue(ok(undefined)),
    updateLastUsed: vi.fn(),
  } as unknown as IApiKeyRepository;
}

describe('RevokeApiKeyUseCase', () => {
  const input = { id: 'key-1', userId: 'user-1', traceId: 'trace-1' };

  it('revokes an active key successfully', async () => {
    const repo = makeRepo();
    const result = await new RevokeApiKeyUseCase(repo).execute(input);
    expect(result.isOk()).toBe(true);
    expect(repo.revoke).toHaveBeenCalledWith('key-1', 'user-1');
  });

  it('returns not found when key does not belong to user', async () => {
    const repo = makeRepo([]);
    const result = await new RevokeApiKeyUseCase(repo).execute(input);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(ApiKeyNotFoundError);
  });

  it('is idempotent — revoking an already-revoked key succeeds silently', async () => {
    const revokedKey = { ...activeKey, revokedAt: new Date().toISOString() };
    const repo = makeRepo([revokedKey]);
    const result = await new RevokeApiKeyUseCase(repo).execute(input);
    expect(result.isOk()).toBe(true);
    expect(repo.revoke).not.toHaveBeenCalled();
  });

  it('propagates repo list errors', async () => {
    const repo = makeRepo();
    (repo.listByUser as ReturnType<typeof vi.fn>).mockResolvedValue(err(new Error('db error')));
    const result = await new RevokeApiKeyUseCase(repo).execute(input);
    expect(result.isErr()).toBe(true);
  });
});
