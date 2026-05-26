import { describe, it, expect, vi } from 'vitest';
import { ok, err } from 'neverthrow';
import { AnalyzeBuildUseCase } from '../analyze-build';
import { LLMClientError } from '../../ports/llm-client';
import { BuildAnalysisRepositoryError } from '../../ports/build-analysis-repository';
import type { IBuildAnalysisRepository } from '../../ports/build-analysis-repository';
import type { ISignalRepository } from '../../ports/signal-repository';
import type { ILLMClient, LLMBuildResponse } from '../../ports/llm-client';
import type { Signal } from '../../domain/signal';
import type { BuildAnalysis } from '../../domain/build-analysis';

const ideaId = crypto.randomUUID();
const userId = crypto.randomUUID();

const makeSignal = (overrides: Partial<Signal> = {}): Signal => ({
  id: crypto.randomUUID(),
  ideaId,
  source: 'github',
  url: 'https://github.com/org/repo',
  title: 'Next.js authentication library',
  summary: 'Auth.js provides Next.js and React authentication',
  sentiment: 'positive',
  fetchedAt: new Date().toISOString(),
  ...overrides,
});

const llmBuildResponse: LLMBuildResponse = {
  stack: [
    {
      name: 'Frontend',
      description: 'React SPA',
      decision: 'oss',
      rationale: 'Widely adopted',
      libraries: [{ name: 'Next.js', purpose: 'Framework' }],
    },
    {
      name: 'Database',
      description: 'PostgreSQL',
      decision: 'oss',
      rationale: 'Battle-tested',
      libraries: [],
    },
  ],
  gaps: [
    {
      title: 'No real-time sync',
      description: 'Signal data is static',
      opportunity: 'Add websocket updates',
    },
  ],
};

function makeBuildRepo(existing: BuildAnalysis | null = null): IBuildAnalysisRepository {
  return {
    save: vi.fn().mockImplementation((a) => Promise.resolve(ok(a))),
    findByIdeaId: vi.fn().mockResolvedValue(ok(existing)),
  };
}

function makeSignalRepo(signals: Signal[] = [makeSignal()]): ISignalRepository {
  return {
    upsertMany: vi.fn(),
    findByIdeaId: vi.fn().mockResolvedValue(ok(signals)),
    findTopByEmbedding: vi.fn(),
    saveEmbeddings: vi.fn().mockResolvedValue(ok(undefined)),
  };
}

function makeLLMClient(response = llmBuildResponse): ILLMClient {
  return {
    generateSearchQueries: vi.fn(),
    scoreSignalRelevance: vi.fn(),
    generateDecision: vi.fn(),
    generateSimulation: vi.fn(),
    generateLanding: vi.fn(),
    analyzeCustomers: vi.fn(),
    analyzeBuild: vi.fn().mockResolvedValue(ok(response)),
    analyzeCompetitors: vi.fn(),
    chatWithOtto: vi.fn(),
    generateLaunchKit: vi.fn(),
    generatePriorityExplanation: vi.fn(),
  };
}

describe('AnalyzeBuildUseCase', () => {
  it('generates and persists a build analysis', async () => {
    const useCase = new AnalyzeBuildUseCase(makeBuildRepo(), makeSignalRepo(), makeLLMClient());
    const result = await useCase.execute({ ideaId, ideaText: 'A SaaS auth tool', userId, traceId: 'trace-1' });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.ideaId).toBe(ideaId);
      expect(result.value.stack).toHaveLength(2);
    }
  });

  it('returns cached analysis when one already exists', async () => {
    const existing: BuildAnalysis = {
      id: crypto.randomUUID(), ideaId, userId,
      stack: llmBuildResponse.stack, gaps: llmBuildResponse.gaps,
      signalCount: 1, createdAt: new Date().toISOString(),
    };
    const llm = makeLLMClient();
    const useCase = new AnalyzeBuildUseCase(makeBuildRepo(existing), makeSignalRepo(), llm);

    const result = await useCase.execute({ ideaId, ideaText: 'A SaaS auth tool', userId, traceId: 'trace-1' });

    expect(result.isOk()).toBe(true);
    expect(llm.analyzeBuild).not.toHaveBeenCalled();
  });

  it('limits signals to 12 before sending to LLM', async () => {
    const signals = Array.from({ length: 20 }, () => makeSignal());
    const llm = makeLLMClient();
    const useCase = new AnalyzeBuildUseCase(makeBuildRepo(), makeSignalRepo(signals), llm);

    await useCase.execute({ ideaId, ideaText: 'A SaaS auth tool', userId, traceId: 'trace-1' });

    expect(llm.analyzeBuild).toHaveBeenCalledWith(
      expect.objectContaining({ signals: expect.arrayContaining([]) }),
    );
    const callArgs = vi.mocked(llm.analyzeBuild).mock.calls[0]?.[0];
    expect(callArgs?.signals.length).toBeLessThanOrEqual(12);
  });

  it('computes HIGH confidence tier when stack components appear in signals', async () => {
    const signals = [
      makeSignal({ title: 'Next.js 14 performance improvements' }),
      makeSignal({ title: 'PostgreSQL scaling tips', source: 'hn' }),
    ];
    const useCase = new AnalyzeBuildUseCase(makeBuildRepo(), makeSignalRepo(signals), makeLLMClient());

    const result = await useCase.execute({ ideaId, ideaText: 'A SaaS auth tool', userId, traceId: 'trace-1' });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect(result.value.confidenceTier).toBe('HIGH');
  });

  it('computes LOW confidence tier when signals do not mention stack components', async () => {
    const signals = [makeSignal({ title: 'General market trends', summary: 'Nothing specific' })];
    const useCase = new AnalyzeBuildUseCase(makeBuildRepo(), makeSignalRepo(signals), makeLLMClient());

    const result = await useCase.execute({ ideaId, ideaText: 'A SaaS auth tool', userId, traceId: 'trace-1' });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect(result.value.confidenceTier).toBe('LOW');
  });

  it('returns LLM error when LLM call fails', async () => {
    const llm: ILLMClient = {
      ...makeLLMClient(),
      analyzeBuild: vi.fn().mockResolvedValue(err(new LLMClientError('timeout'))),
    };
    const useCase = new AnalyzeBuildUseCase(makeBuildRepo(), makeSignalRepo(), llm);

    const result = await useCase.execute({ ideaId, ideaText: 'A SaaS auth tool', userId, traceId: 'trace-1' });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toBeInstanceOf(LLMClientError);
  });

  it('returns repo error when save fails', async () => {
    const repo: IBuildAnalysisRepository = {
      save: vi.fn().mockResolvedValue(err(new BuildAnalysisRepositoryError('DB down'))),
      findByIdeaId: vi.fn().mockResolvedValue(ok(null)),
    };
    const useCase = new AnalyzeBuildUseCase(repo, makeSignalRepo(), makeLLMClient());

    const result = await useCase.execute({ ideaId, ideaText: 'A SaaS auth tool', userId, traceId: 'trace-1' });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toBeInstanceOf(BuildAnalysisRepositoryError);
  });
});
