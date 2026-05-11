import { describe, it, expect, vi } from 'vitest';
import { ok, err } from 'neverthrow';
import { AnalyzeBuildUseCase } from '../analyze-build';
import { LLMClientError } from '../../ports/llm-client';
import { BuildAnalysisRepositoryError } from '../../ports/build-analysis-repository';
import type { IBuildAnalysisRepository } from '../../ports/build-analysis-repository';
import type { ISignalRepository } from '../../ports/signal-repository';
import type { ILLMClient, LLMBuildResponse } from '../../ports/llm-client';
import type { BuildAnalysis } from '../../domain/build-analysis';
import type { Signal } from '../../domain/signal';

const ideaId = crypto.randomUUID();
const userId = crypto.randomUUID();

const makeSignal = (source: 'reddit' | 'github' = 'github'): Signal => ({
  id: crypto.randomUUID(),
  ideaId,
  source,
  url: source === 'github' ? 'https://github.com/some/repo' : 'https://reddit.com/r/startups/comments/abc',
  title: 'A relevant repo for this idea',
  summary: 'Developers use this lib to solve the problem',
  sentiment: 'positive',
  fetchedAt: new Date().toISOString(),
});

const llmResponse: LLMBuildResponse = {
  stack: [
    {
      name: 'Next.js',
      description: 'Full-stack React framework',
      decision: 'oss',
      rationale: 'Battle-tested, Vercel-native, great DX',
      libraries: [{ name: 'next', purpose: 'Framework core', githubUrl: 'https://github.com/vercel/next.js' }],
    },
    {
      name: 'Supabase',
      description: 'Database + Auth + Realtime',
      decision: 'buy',
      rationale: 'Managed Postgres, free tier sufficient for MVP',
      libraries: [],
    },
  ],
  gaps: [
    {
      title: 'No real-time collaboration',
      description: 'GitHub signals show demand for team features',
      opportunity: 'Add multiplayer editing via Supabase Realtime',
    },
  ],
};

function makeRepo(existing: BuildAnalysis | null = null): IBuildAnalysisRepository {
  return {
    save: vi.fn().mockImplementation((a) => Promise.resolve(ok(a))),
    findByIdeaId: vi.fn().mockResolvedValue(ok(existing)),
  };
}

function makeSignalRepo(signals: Signal[] = [makeSignal('github'), makeSignal('github'), makeSignal('reddit')]): ISignalRepository {
  return {
    upsertMany: vi.fn(),
    findByIdeaId: vi.fn().mockResolvedValue(ok(signals)),
  };
}

function makeLLM(response = llmResponse): ILLMClient {
  return {
    generateDecision: vi.fn(),
    generateSimulation: vi.fn(),
    generateLanding: vi.fn(),
    analyzeCustomers: vi.fn(),
    analyzeBuild: vi.fn().mockResolvedValue(ok(response)),
  };
}

describe('AnalyzeBuildUseCase', () => {
  it('generates and persists build analysis', async () => {
    const repo = makeRepo();
    const llm = makeLLM();
    const useCase = new AnalyzeBuildUseCase(repo, makeSignalRepo(), llm);

    const result = await useCase.execute({ ideaId, ideaText: 'idea validation tool', userId, traceId: 'trace-1' });

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.stack).toHaveLength(2);
    expect(result.value.gaps).toHaveLength(1);
    expect(result.value.signalCount).toBe(2); // 2 github signals
    expect(repo.save).toHaveBeenCalledOnce();
    expect(llm.analyzeBuild).toHaveBeenCalledOnce();
  });

  it('returns cached result if analysis already exists', async () => {
    const existing: BuildAnalysis = {
      id: crypto.randomUUID(),
      ideaId,
      userId,
      stack: llmResponse.stack,
      gaps: llmResponse.gaps,
      signalCount: 2,
      createdAt: new Date().toISOString(),
    };
    const repo = makeRepo(existing);
    const llm = makeLLM();
    const useCase = new AnalyzeBuildUseCase(repo, makeSignalRepo(), llm);

    const result = await useCase.execute({ ideaId, ideaText: 'idea validation tool', userId, traceId: 'trace-2' });

    expect(result.isOk()).toBe(true);
    expect(llm.analyzeBuild).not.toHaveBeenCalled();
  });

  it('propagates LLM error', async () => {
    const llmError = new LLMClientError('timeout');
    const llm: ILLMClient = {
      generateDecision: vi.fn(),
      generateSimulation: vi.fn(),
      generateLanding: vi.fn(),
      analyzeCustomers: vi.fn(),
      analyzeBuild: vi.fn().mockResolvedValue(err(llmError)),
    };
    const useCase = new AnalyzeBuildUseCase(makeRepo(), makeSignalRepo(), llm);

    const result = await useCase.execute({ ideaId, ideaText: 'idea validation tool', userId, traceId: 'trace-3' });

    expect(result.isErr()).toBe(true);
    if (!result.isErr()) return;
    expect(result.error).toBeInstanceOf(LLMClientError);
  });

  it('propagates repo save error', async () => {
    const repoError = new BuildAnalysisRepositoryError('db down');
    const repo: IBuildAnalysisRepository = {
      save: vi.fn().mockResolvedValue(err(repoError)),
      findByIdeaId: vi.fn().mockResolvedValue(ok(null)),
    };
    const useCase = new AnalyzeBuildUseCase(repo, makeSignalRepo(), makeLLM());

    const result = await useCase.execute({ ideaId, ideaText: 'idea validation tool', userId, traceId: 'trace-4' });

    expect(result.isErr()).toBe(true);
    if (!result.isErr()) return;
    expect(result.error).toBeInstanceOf(BuildAnalysisRepositoryError);
  });

  it('counts only github signals for signalCount', async () => {
    const signals = [makeSignal('reddit'), makeSignal('reddit'), makeSignal('github')];
    const useCase = new AnalyzeBuildUseCase(makeRepo(), makeSignalRepo(signals), makeLLM());

    const result = await useCase.execute({ ideaId, ideaText: 'idea validation tool', userId, traceId: 'trace-5' });

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.signalCount).toBe(1);
  });
});
