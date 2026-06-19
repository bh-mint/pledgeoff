import { describe, it, expect } from 'vitest';
import { ok, err } from 'neverthrow';
import { DeleteIdeaUseCase } from '../delete-idea';
import { IdeaRepositoryError } from '../../ports/idea-repository';
import type { IIdeaRepository, IdeasPage } from '../../ports/idea-repository';
import type { Idea } from '../../domain/idea';

const baseIdea: Idea = {
  id: 'idea-001',
  userId: 'user-abc',
  text: 'A great product idea that has more than 10 chars',
  niche: 'other',
  createdAt: new Date().toISOString(),
};

function makeRepo(overrides?: Partial<IIdeaRepository>): IIdeaRepository {
  return {
    save: async (i) => ok(i),
    saveWithEvent: async (i) => ok(i),
    findById: async () => ok(baseIdea),
    findByUserId: async () => ok([]),
    findByUserIds: async () => ok([]),
    findByUserIdPaginated: async () => ok<IdeasPage, IdeaRepositoryError>({ ideas: [], hasMore: false, nextCursor: null }),
    findByTeamId: async () => ok([]),
    countThisMonth: async () => ok(0),
    delete: async () => ok(undefined),
    ...overrides,
  };
}

describe('DeleteIdeaUseCase', () => {
  it('deletes successfully when idea exists and belongs to user', async () => {
    const repo = makeRepo();
    const useCase = new DeleteIdeaUseCase(repo);

    const result = await useCase.execute({
      ideaId: 'idea-001',
      userId: 'user-abc',
      traceId: 'trace-1',
    });

    expect(result.isOk()).toBe(true);
  });

  it('returns NOT_FOUND when idea does not exist', async () => {
    const repo = makeRepo({ findById: async () => ok(null) });
    const useCase = new DeleteIdeaUseCase(repo);

    const result = await useCase.execute({
      ideaId: 'idea-missing',
      userId: 'user-abc',
      traceId: 'trace-1',
    });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().code).toBe('NOT_FOUND');
  });

  it('returns NOT_FOUND when idea belongs to a different user', async () => {
    const repo = makeRepo({ findById: async () => ok({ ...baseIdea, userId: 'user-other' }) });
    const useCase = new DeleteIdeaUseCase(repo);

    const result = await useCase.execute({
      ideaId: 'idea-001',
      userId: 'user-abc',
      traceId: 'trace-1',
    });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().code).toBe('NOT_FOUND');
  });

  it('returns INTERNAL when findById fails', async () => {
    const repo = makeRepo({
      findById: async () => err(new IdeaRepositoryError('db error')),
    });
    const useCase = new DeleteIdeaUseCase(repo);

    const result = await useCase.execute({
      ideaId: 'idea-001',
      userId: 'user-abc',
      traceId: 'trace-1',
    });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().code).toBe('INTERNAL');
  });

  it('returns INTERNAL when delete fails', async () => {
    const repo = makeRepo({
      delete: async () => err(new IdeaRepositoryError('db error')),
    });
    const useCase = new DeleteIdeaUseCase(repo);

    const result = await useCase.execute({
      ideaId: 'idea-001',
      userId: 'user-abc',
      traceId: 'trace-1',
    });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().code).toBe('INTERNAL');
  });
});
