import { describe, it, expect, vi } from 'vitest';
import { ok, err } from 'neverthrow';
import { GenerateMarketLandscapeUseCase } from '../generate-market-landscape';
import { LLMClientError } from '../../ports/llm-client';
import { MarketLandscapeRepositoryError } from '../../ports/IMarketLandscapeRepository';
import type { IMarketLandscapeRepository } from '../../ports/IMarketLandscapeRepository';
import type { ISignalRepository } from '../../ports/signal-repository';
import type { ILLMClient, LLMMarketLandscapeResponse } from '../../ports/llm-client';
import type { MarketLandscape } from '../../domain/market-landscape';
import type { Signal } from '../../domain/signal';

const ideaId = crypto.randomUUID();
const userId = crypto.randomUUID();

const makeSignal = (): Signal => ({
  id: crypto.randomUUID(),
  ideaId,
  source: 'hn',
  url: 'https://news.ycombinator.com/item?id=123',
  title: 'Market discussion',
  summary: 'Lots of competition in this space',
  sentiment: 'neutral',
  fetchedAt: new Date().toISOString(),
});

const llmResponse: LLMMarketLandscapeResponse = {
  segments: [
    { name: 'SMB Product Teams', situation: 'growing', description: 'Growing segment with unmet needs' },
    { name: 'Enterprise R&D', situation: 'competitive', description: 'Dominated by incumbents' },
    { name: 'Indie Hackers', situation: 'opportunity', description: 'Underserved, high intent' },
  ],
  trends: ['AI integration becoming table stakes', 'No-code validation tools rising'],
  uncoveredOpportunities: ['Real-time signal ingestion', 'Calibrated verdict with outcome tracking'],
};

function makeRepo(existing: MarketLandscape | null = null): IMarketLandscapeRepository {
  return {
    save: vi.fn().mockImplementation((l) => Promise.resolve(ok(l))),
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

function makeLLM(response = llmResponse): ILLMClient {
  return {
    generateSearchQueries: vi.fn(), scoreSignalRelevance: vi.fn(), generateDecision: vi.fn(),
    generateSimulation: vi.fn(), generateLanding: vi.fn(),
    analyzeCustomers: vi.fn(), analyzeBuild: vi.fn(),
    analyzeCompetitors: vi.fn(), chatWithOtto: vi.fn(),
    generateLaunchKit: vi.fn(), generatePriorityExplanation: vi.fn(),
    analyzeFeatures: vi.fn(), generateBattlecard: vi.fn(),
    generateMarketLandscape: vi.fn().mockResolvedValue(ok(response)),
  };
}

describe('GenerateMarketLandscapeUseCase', () => {
  it('generates and persists market landscape', async () => {
    const repo = makeRepo();
    const llm = makeLLM();
    const useCase = new GenerateMarketLandscapeUseCase(llm, repo, makeSignalRepo());

    const result = await useCase.execute({ ideaId, userId, ideaText: 'idea validation tool', traceId: 'trace-1' });

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.segments).toHaveLength(3);
    expect(result.value.trends).toHaveLength(2);
    expect(result.value.uncoveredOpportunities).toHaveLength(2);
    expect(repo.save).toHaveBeenCalledOnce();
    expect(llm.generateMarketLandscape).toHaveBeenCalledOnce();
  });

  it('returns cached result if landscape already exists', async () => {
    const existing: MarketLandscape = {
      id: crypto.randomUUID(),
      ideaId, userId,
      segments: llmResponse.segments,
      trends: llmResponse.trends,
      uncoveredOpportunities: llmResponse.uncoveredOpportunities,
      createdAt: new Date().toISOString(),
    };
    const repo = makeRepo(existing);
    const llm = makeLLM();
    const useCase = new GenerateMarketLandscapeUseCase(llm, repo, makeSignalRepo());

    const result = await useCase.execute({ ideaId, userId, ideaText: 'idea validation tool', traceId: 'trace-2' });

    expect(result.isOk()).toBe(true);
    expect(llm.generateMarketLandscape).not.toHaveBeenCalled();
  });

  it('propagates LLM error', async () => {
    const llmError = new LLMClientError('timeout');
    const llm: ILLMClient = {
      generateSearchQueries: vi.fn(), scoreSignalRelevance: vi.fn(), generateDecision: vi.fn(),
      generateSimulation: vi.fn(), generateLanding: vi.fn(),
      analyzeCustomers: vi.fn(), analyzeBuild: vi.fn(),
      analyzeCompetitors: vi.fn(), chatWithOtto: vi.fn(),
      generateLaunchKit: vi.fn(), generatePriorityExplanation: vi.fn(),
      analyzeFeatures: vi.fn(), generateBattlecard: vi.fn(),
      generateMarketLandscape: vi.fn().mockResolvedValue(err(llmError)),
    };
    const useCase = new GenerateMarketLandscapeUseCase(llm, makeRepo(), makeSignalRepo());

    const result = await useCase.execute({ ideaId, userId, ideaText: 'idea validation tool', traceId: 'trace-3' });

    expect(result.isErr()).toBe(true);
    if (!result.isErr()) return;
    expect(result.error).toBeInstanceOf(LLMClientError);
  });

  it('propagates repo save error', async () => {
    const repoError = new MarketLandscapeRepositoryError('db down');
    const repo: IMarketLandscapeRepository = {
      save: vi.fn().mockResolvedValue(err(repoError)),
      findByIdeaId: vi.fn().mockResolvedValue(ok(null)),
    };
    const useCase = new GenerateMarketLandscapeUseCase(makeLLM(), repo, makeSignalRepo());

    const result = await useCase.execute({ ideaId, userId, ideaText: 'idea validation tool', traceId: 'trace-4' });

    expect(result.isErr()).toBe(true);
    if (!result.isErr()) return;
    expect(result.error).toBeInstanceOf(MarketLandscapeRepositoryError);
  });
});
