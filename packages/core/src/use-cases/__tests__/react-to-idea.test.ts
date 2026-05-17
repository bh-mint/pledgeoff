import { describe, it, expect } from 'vitest';
import { ok, err } from 'neverthrow';
import { ReactToIdeaUseCase } from '../react-to-idea';
import { IdeaReactionRepositoryError } from '../../ports/idea-reaction-repository';
import type { IIdeaReactionRepository } from '../../ports/idea-reaction-repository';
import type { IdeaReaction } from '../../domain/idea-reaction';

function makeReaction(override?: Partial<IdeaReaction>): IdeaReaction {
  return {
    id: 'rxn-1', ideaId: 'idea-1', userId: 'user-1',
    reaction: 'agree', createdAt: '2026-01-01T00:00:00.000Z',
    ...override,
  };
}

function mockRepo(overrides?: Partial<IIdeaReactionRepository>): IIdeaReactionRepository {
  return {
    upsert: async (entry) => ok(entry),
    delete: async () => ok(undefined),
    findByIdeaIds: async () => ok([]),
    findByIdeaIdAndUserId: async () => ok(null),
    countByIdeaId: async () => ok(0),
    ...overrides,
  };
}

describe('ReactToIdeaUseCase', () => {
  it('creates an agree reaction', async () => {
    const repo = mockRepo({ upsert: async (e) => ok(e) });
    const uc = new ReactToIdeaUseCase(repo);
    const result = await uc.execute({ userId: 'user-1', ideaId: 'idea-1', reaction: 'agree' });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().reaction?.reaction).toBe('agree');
  });

  it('creates a disagree reaction', async () => {
    const repo = mockRepo({ upsert: async (e) => ok(e) });
    const uc = new ReactToIdeaUseCase(repo);
    const result = await uc.execute({ userId: 'user-1', ideaId: 'idea-1', reaction: 'disagree' });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().reaction?.reaction).toBe('disagree');
  });

  it('removes reaction when reaction is null', async () => {
    let deleteCalled = false;
    const repo = mockRepo({ delete: async () => { deleteCalled = true; return ok(undefined); } });
    const uc = new ReactToIdeaUseCase(repo);
    const result = await uc.execute({ userId: 'user-1', ideaId: 'idea-1', reaction: null });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().reaction).toBeNull();
    expect(deleteCalled).toBe(true);
  });

  it('propagates repository error on upsert failure', async () => {
    const repoError = new IdeaReactionRepositoryError('DB error');
    const repo = mockRepo({ upsert: async () => err(repoError) });
    const uc = new ReactToIdeaUseCase(repo);
    const result = await uc.execute({ userId: 'user-1', ideaId: 'idea-1', reaction: 'agree' });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(IdeaReactionRepositoryError);
  });

  it('propagates repository error on delete failure', async () => {
    const repoError = new IdeaReactionRepositoryError('DB error');
    const repo = mockRepo({ delete: async () => err(repoError) });
    const uc = new ReactToIdeaUseCase(repo);
    const result = await uc.execute({ userId: 'user-1', ideaId: 'idea-1', reaction: null });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(IdeaReactionRepositoryError);
  });

  it('upsert overwrites existing reaction (repo handles UNIQUE constraint)', async () => {
    const stored = makeReaction({ reaction: 'agree' });
    const repo = mockRepo({ upsert: async (e) => ok({ ...stored, reaction: e.reaction }) });
    const uc = new ReactToIdeaUseCase(repo);
    const result = await uc.execute({ userId: 'user-1', ideaId: 'idea-1', reaction: 'disagree' });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().reaction?.reaction).toBe('disagree');
  });
});
