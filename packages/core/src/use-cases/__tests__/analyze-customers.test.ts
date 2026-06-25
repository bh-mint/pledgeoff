import { describe, it, expect, vi } from 'vitest';
import { ok, err } from 'neverthrow';
import { AnalyzeCustomersUseCase } from '../analyze-customers';
import { LLMClientError } from '../../ports/llm-client';
import { CustomerAnalysisRepositoryError } from '../../ports/customer-analysis-repository';
import type { ICustomerAnalysisRepository } from '../../ports/customer-analysis-repository';
import type { ISignalRepository } from '../../ports/signal-repository';
import type { ILLMClient, LLMCustomerResponse } from '../../ports/llm-client';
import type { CustomerAnalysis } from '../../domain/customer-analysis';
import type { Signal } from '../../domain/signal';

const ideaId = crypto.randomUUID();
const userId = crypto.randomUUID();

const makeSignal = (): Signal => ({
  id: crypto.randomUUID(),
  ideaId,
  source: 'reddit',
  url: 'https://reddit.com/r/startups/comments/abc',
  title: 'Founders are struggling with idea validation',
  summary: 'Many founders waste months building wrong things without validation',
  sentiment: 'positive',
  fetchedAt: new Date().toISOString(),
});

const llmResponse: LLMCustomerResponse = {
  segments: [
    { name: 'Solo founders', description: 'Building alone, limited time for research', size: 'large' },
    { name: 'Early-stage startups', description: '2-5 person teams pre-product-market fit', size: 'medium' },
  ],
  painPoints: [
    { text: 'No structured way to validate ideas before investing months', rank: 1 },
    { text: 'Difficult to gather real market signals quickly', rank: 2 },
    { text: 'Fear of building something nobody wants', rank: 3 },
  ],
  sentiment: { positive: 60, negative: 25, neutral: 15 },
  quotes: [
    { text: 'Many founders waste months building wrong things without validation', source: 'reddit', url: 'https://reddit.com/r/startups/comments/abc' },
  ],
};

function makeRepo(existing: CustomerAnalysis | null = null): ICustomerAnalysisRepository {
  return {
    save: vi.fn().mockImplementation((a) => Promise.resolve(ok(a))),
    findByIdeaId: vi.fn().mockResolvedValue(ok(existing)),
  };
}

function makeSignalRepo(): ISignalRepository {
  return {
    upsertMany: vi.fn(),
    findByIdeaId: vi.fn().mockResolvedValue(ok([makeSignal()])),
    findTopByEmbedding: vi.fn(),
    saveEmbeddings: vi.fn().mockResolvedValue(ok(undefined)),
  };
}

function makeLLM(response = llmResponse): ILLMClient {
  return {
    generateSearchQueries: vi.fn(), scoreSignalRelevance: vi.fn(), generateDecision: vi.fn(),
    generateSimulation: vi.fn(),
    generateLanding: vi.fn(),
    analyzeCustomers: vi.fn().mockResolvedValue(ok(response)),
    analyzeBuild: vi.fn(), analyzeCompetitors: vi.fn(),
    chatWithOtto: vi.fn(),
    generateLaunchKit: vi.fn(),
    generatePriorityExplanation: vi.fn(),
    analyzeFeatures: vi.fn(),
  };
}

describe('AnalyzeCustomersUseCase', () => {
  it('generates and persists customer analysis', async () => {
    const repo = makeRepo();
    const llm = makeLLM();
    const useCase = new AnalyzeCustomersUseCase(repo, makeSignalRepo(), llm);

    const result = await useCase.execute({ ideaId, ideaText: 'idea validation tool', userId, traceId: 'trace-1' });

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.segments).toHaveLength(2);
    expect(result.value.painPoints).toHaveLength(3);
    expect(result.value.sentiment.positive).toBe(60);
    expect(result.value.quotes).toHaveLength(1);
    expect(repo.save).toHaveBeenCalledOnce();
    expect(llm.analyzeCustomers).toHaveBeenCalledOnce();
  });

  it('passes limited flag to LLM when free plan', async () => {
    const repo = makeRepo();
    const llm = makeLLM();
    const useCase = new AnalyzeCustomersUseCase(repo, makeSignalRepo(), llm);

    await useCase.execute({ ideaId, ideaText: 'idea validation tool', userId, traceId: 'trace-limited', limited: true });

    expect(llm.analyzeCustomers).toHaveBeenCalledWith(
      expect.objectContaining({ limited: true }),
    );
  });

  it('passes limited: undefined when not set (full plan)', async () => {
    const repo = makeRepo();
    const llm = makeLLM();
    const useCase = new AnalyzeCustomersUseCase(repo, makeSignalRepo(), llm);

    await useCase.execute({ ideaId, ideaText: 'idea validation tool', userId, traceId: 'trace-full' });

    expect(llm.analyzeCustomers).toHaveBeenCalledWith(
      expect.objectContaining({ limited: undefined }),
    );
  });

  it('returns cached result if analysis already exists', async () => {
    const existing: CustomerAnalysis = {
      id: crypto.randomUUID(),
      ideaId,
      userId,
      segments: llmResponse.segments,
      painPoints: llmResponse.painPoints,
      sentiment: llmResponse.sentiment,
      quotes: llmResponse.quotes,
      createdAt: new Date().toISOString(),
    };
    const repo = makeRepo(existing);
    const llm = makeLLM();
    const useCase = new AnalyzeCustomersUseCase(repo, makeSignalRepo(), llm);

    const result = await useCase.execute({ ideaId, ideaText: 'idea validation tool', userId, traceId: 'trace-2' });

    expect(result.isOk()).toBe(true);
    expect(llm.analyzeCustomers).not.toHaveBeenCalled();
  });

  it('propagates LLM error', async () => {
    const llmError = new LLMClientError('timeout');
    const llm: ILLMClient = {
      generateSearchQueries: vi.fn(), scoreSignalRelevance: vi.fn(), generateDecision: vi.fn(),
      generateSimulation: vi.fn(),
      generateLanding: vi.fn(),
      analyzeCustomers: vi.fn().mockResolvedValue(err(llmError)),
      analyzeBuild: vi.fn(), analyzeCompetitors: vi.fn(),
    chatWithOtto: vi.fn(),
    generateLaunchKit: vi.fn(),
    generatePriorityExplanation: vi.fn(),
    analyzeFeatures: vi.fn(),
    };
    const useCase = new AnalyzeCustomersUseCase(makeRepo(), makeSignalRepo(), llm);

    const result = await useCase.execute({ ideaId, ideaText: 'idea validation tool', userId, traceId: 'trace-3' });

    expect(result.isErr()).toBe(true);
    if (!result.isErr()) return;
    expect(result.error).toBeInstanceOf(LLMClientError);
  });

  it('propagates repo save error', async () => {
    const repoError = new CustomerAnalysisRepositoryError('db down');
    const repo: ICustomerAnalysisRepository = {
      save: vi.fn().mockResolvedValue(err(repoError)),
      findByIdeaId: vi.fn().mockResolvedValue(ok(null)),
    };
    const useCase = new AnalyzeCustomersUseCase(repo, makeSignalRepo(), makeLLM());

    const result = await useCase.execute({ ideaId, ideaText: 'idea validation tool', userId, traceId: 'trace-4' });

    expect(result.isErr()).toBe(true);
    if (!result.isErr()) return;
    expect(result.error).toBeInstanceOf(CustomerAnalysisRepositoryError);
  });
});
