import { describe, it, expect, vi } from 'vitest';
import { ok, err } from 'neverthrow';
import { CreateIdeaUseCase } from '../create-idea.js';
import { IdeaRepositoryError } from '../../ports/idea-repository.js';
import { EventBusError } from '../../ports/event-bus.js';
import { IdeaTooShortError } from '../../domain/idea.js';
import type { IIdeaRepository } from '../../ports/idea-repository.js';
import type { IEventBus } from '../../ports/event-bus.js';

function makeRepo(overrides: Partial<IIdeaRepository> = {}): IIdeaRepository {
  return {
    save: vi.fn().mockResolvedValue(ok({ id: crypto.randomUUID(), userId: 'u1', text: 'test idea text ok', createdAt: new Date().toISOString() })),
    findById: vi.fn(),
    findByUserId: vi.fn(),
    ...overrides,
  };
}

function makeEventBus(overrides: Partial<IEventBus> = {}): IEventBus {
  return {
    publish: vi.fn().mockResolvedValue(ok(undefined)),
    subscribe: vi.fn(),
    ...overrides,
  };
}

describe('CreateIdeaUseCase', () => {
  const validInput = {
    userId: crypto.randomUUID(),
    text: 'An interesting app idea for the market',
    traceId: crypto.randomUUID(),
  };

  it('creates and persists an idea, publishes event', async () => {
    const repo = makeRepo();
    const bus = makeEventBus();
    const useCase = new CreateIdeaUseCase(repo, bus);

    const result = await useCase.execute(validInput);

    expect(result.isOk()).toBe(true);
    expect(repo.save).toHaveBeenCalledOnce();
    expect(bus.publish).toHaveBeenCalledOnce();
    expect(bus.publish).toHaveBeenCalledWith('idea.created.v1', expect.objectContaining({
      eventType: 'idea.created.v1',
      eventVersion: 1,
      traceId: validInput.traceId,
    }));
  });

  it('returns domain error when idea text is too short', async () => {
    const repo = makeRepo();
    const bus = makeEventBus();
    const useCase = new CreateIdeaUseCase(repo, bus);

    const result = await useCase.execute({ ...validInput, text: 'short' });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(IdeaTooShortError);
    }
    expect(repo.save).not.toHaveBeenCalled();
    expect(bus.publish).not.toHaveBeenCalled();
  });

  it('returns repository error when save fails', async () => {
    const repoError = new IdeaRepositoryError('DB connection failed');
    const repo = makeRepo({ save: vi.fn().mockResolvedValue(err(repoError)) });
    const bus = makeEventBus();
    const useCase = new CreateIdeaUseCase(repo, bus);

    const result = await useCase.execute(validInput);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(IdeaRepositoryError);
    }
    expect(bus.publish).not.toHaveBeenCalled();
  });

  it('returns event bus error when publish fails', async () => {
    const busError = new EventBusError('Publish failed');
    const repo = makeRepo();
    const bus = makeEventBus({ publish: vi.fn().mockResolvedValue(err(busError)) });
    const useCase = new CreateIdeaUseCase(repo, bus);

    const result = await useCase.execute(validInput);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(EventBusError);
    }
  });
});
