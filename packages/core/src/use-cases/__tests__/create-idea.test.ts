import { describe, it, expect, vi } from 'vitest';
import { ok, err } from 'neverthrow';
import { CreateIdeaUseCase } from '../create-idea';
import { IdeaRepositoryError } from '../../ports/idea-repository';
import { IdeaTooShortError } from '../../domain/idea';
import type { IIdeaRepository } from '../../ports/idea-repository';

function makeRepo(overrides: Partial<IIdeaRepository> = {}): IIdeaRepository {
  return {
    save: vi.fn().mockResolvedValue(ok({ id: crypto.randomUUID(), userId: 'u1', text: 'test idea text ok', createdAt: new Date().toISOString() })),
    saveWithEvent: vi.fn().mockImplementation((idea) => Promise.resolve(ok(idea))),
    findById: vi.fn(),
    findByUserId: vi.fn(),
    findByUserIds: vi.fn().mockResolvedValue(ok([])),
    findByUserIdPaginated: vi.fn().mockResolvedValue(ok({ ideas: [], hasMore: false, nextCursor: null })),
    countThisMonth: vi.fn().mockResolvedValue(ok(0)),
    ...overrides,
  };
}

describe('CreateIdeaUseCase', () => {
  const validInput = {
    userId: crypto.randomUUID(),
    text: 'An interesting app idea for the market',
    traceId: crypto.randomUUID(),
  };

  it('creates idea and atomically persists with event', async () => {
    const repo = makeRepo();
    const useCase = new CreateIdeaUseCase(repo);

    const result = await useCase.execute(validInput);

    expect(result.isOk()).toBe(true);
    expect(repo.saveWithEvent).toHaveBeenCalledOnce();
    expect(repo.saveWithEvent).toHaveBeenCalledWith(
      expect.objectContaining({ userId: validInput.userId }),
      expect.objectContaining({
        eventType: 'idea.created.v1',
        payload: expect.objectContaining({ eventType: 'idea.created.v1', eventVersion: 1, traceId: validInput.traceId }),
      }),
    );
  });

  it('passes teamId to saved idea when provided', async () => {
    const teamId = crypto.randomUUID();
    const repo = makeRepo();
    const useCase = new CreateIdeaUseCase(repo);

    const result = await useCase.execute({ ...validInput, teamId });

    expect(result.isOk()).toBe(true);
    expect(repo.saveWithEvent).toHaveBeenCalledWith(
      expect.objectContaining({ teamId }),
      expect.any(Object),
    );
  });

  it('saves idea without teamId when not provided', async () => {
    const repo = makeRepo();
    const useCase = new CreateIdeaUseCase(repo);

    const result = await useCase.execute(validInput);

    expect(result.isOk()).toBe(true);
    expect(repo.saveWithEvent).toHaveBeenCalledWith(
      expect.objectContaining({ teamId: null }),
      expect.any(Object),
    );
  });

  it('returns domain error when idea text is too short', async () => {
    const repo = makeRepo();
    const useCase = new CreateIdeaUseCase(repo);

    const result = await useCase.execute({ ...validInput, text: 'short' });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(IdeaTooShortError);
    }
    expect(repo.saveWithEvent).not.toHaveBeenCalled();
  });

  it('returns repository error when saveWithEvent fails', async () => {
    const repoError = new IdeaRepositoryError('DB connection failed');
    const repo = makeRepo({ saveWithEvent: vi.fn().mockResolvedValue(err(repoError)) });
    const useCase = new CreateIdeaUseCase(repo);

    const result = await useCase.execute(validInput);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(IdeaRepositoryError);
    }
  });
});
