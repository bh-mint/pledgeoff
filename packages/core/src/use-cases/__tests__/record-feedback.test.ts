import { describe, it, expect, vi } from 'vitest';
import { ok, err } from 'neverthrow';
import { RecordFeedbackUseCase } from '../record-feedback';
import { FeedbackRepositoryError } from '../../ports/feedback-repository';
import type { IFeedbackRepository } from '../../ports/feedback-repository';
import type { Feedback } from '../../domain/feedback';

function makeRepo(overrides: Partial<IFeedbackRepository> = {}): IFeedbackRepository {
  return {
    save: vi.fn().mockImplementation((f: Feedback) => Promise.resolve(ok(f))),
    findByDecisionId: vi.fn(),
    ...overrides,
  };
}

describe('RecordFeedbackUseCase', () => {
  const baseInput = {
    ideaId: crypto.randomUUID(),
    decisionId: crypto.randomUUID(),
    userId: crypto.randomUUID(),
    vote: 'thumbs_up' as const,
    traceId: crypto.randomUUID(),
  };

  it('records thumbs_up feedback', async () => {
    const repo = makeRepo();
    const useCase = new RecordFeedbackUseCase(repo);

    const result = await useCase.execute(baseInput);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.vote).toBe('thumbs_up');
      expect(result.value.ideaId).toBe(baseInput.ideaId);
      expect(result.value.userId).toBe(baseInput.userId);
    }
    expect(repo.save).toHaveBeenCalledOnce();
  });

  it('records thumbs_down feedback', async () => {
    const repo = makeRepo();
    const useCase = new RecordFeedbackUseCase(repo);

    const result = await useCase.execute({ ...baseInput, vote: 'thumbs_down' });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.vote).toBe('thumbs_down');
    }
  });

  it('returns repository error when save fails', async () => {
    const repoError = new FeedbackRepositoryError('DB write failed');
    const repo = makeRepo({ save: vi.fn().mockResolvedValue(err(repoError)) });
    const useCase = new RecordFeedbackUseCase(repo);

    const result = await useCase.execute(baseInput);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(FeedbackRepositoryError);
    }
  });
});
