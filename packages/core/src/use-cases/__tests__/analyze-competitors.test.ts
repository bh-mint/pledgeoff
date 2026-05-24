import { describe, it, expect, vi } from 'vitest';
import { ok, err } from 'neverthrow';
import { AnalyzeCompetitorsUseCase } from '../analyze-competitors';
import { LLMClientError } from '../../ports/llm-client';
import { CompetitorAnalysisRepositoryError } from '../../ports/competitor-analysis-repository';
import type { ICompetitorAnalysisRepository } from '../../ports/competitor-analysis-repository';
import type { ISignalRepository } from '../../ports/signal-repository';
import type { ILLMClient, LLMCompetitorResponse } from '../../ports/llm-client';
import type { CompetitorAnalysis } from '../../domain/competitor-analysis';
import type { Signal } from '../../domain/signal';

const ideaId = crypto.randomUUID();
const userId = crypto.randomUUID();

const makeSignal = (): Signal => ({
  id: crypto.randomUUID(),
  ideaId,
  source: 'hn',
  url: 'https://news.ycombinator.com/item?id=123',
  title: 'Ask HN: Best tools for idea validation?',
  summary: 'Discussion mentions Validate.io and IdeaCheck as common tools',
  sentiment: 'neutral',
  fetchedAt: new Date().toISOString(),
});

const llmResponse: LLMCompetitorResponse = {
  competitors: [
    {
      name: 'Validate.io',
      url: 'https://validate.io',
      positioning: 'Survey-based idea validation for indie hackers',
      signals: ['Mentioned 3x in HN thread', 'Positive reviews on ProductHunt'],
      source: 'signal',
    },
    {
      name: 'IdeaCheck',
      positioning: 'Manual research assistant with templates',
      signals: ['Used by 2 commenters in thread'],
      source: 'knowledge',
    },
  ],
  gaps: [
    {
      title: 'No automated signal ingestion',
      description: 'Competitors rely on manual research or basic surveys',
      opportunity: 'Automated Reddit + GitHub + HN signals give real-time market evidence',
    },
  ],
};

function makeRepo(existing: CompetitorAnalysis | null = null): ICompetitorAnalysisRepository {
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

function makeLLM(response = llmResponse): ILLMClient {
  return {
    generateSearchQueries: vi.fn(), scoreSignalRelevance: vi.fn(), generateDecision: vi.fn(),
    generateSimulation: vi.fn(), generateLanding: vi.fn(),
    analyzeCustomers: vi.fn(), analyzeBuild: vi.fn(),
    analyzeCompetitors: vi.fn().mockResolvedValue(ok(response)),
    chatWithOtto: vi.fn(),
    generateLaunchKit: vi.fn(),
    generatePriorityExplanation: vi.fn(),
  };
}

describe('AnalyzeCompetitorsUseCase', () => {
  it('generates and persists competitor analysis', async () => {
    const repo = makeRepo();
    const llm = makeLLM();
    const useCase = new AnalyzeCompetitorsUseCase(repo, makeSignalRepo(), llm);

    const result = await useCase.execute({ ideaId, ideaText: 'idea validation tool', userId, traceId: 'trace-1' });

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.competitors).toHaveLength(2);
    expect(result.value.gaps).toHaveLength(1);
    expect(result.value.signalCount).toBe(1);
    expect(repo.save).toHaveBeenCalledOnce();
    expect(llm.analyzeCompetitors).toHaveBeenCalledOnce();
  });

  it('returns cached result if analysis already exists', async () => {
    const existing: CompetitorAnalysis = {
      id: crypto.randomUUID(),
      ideaId, userId,
      competitors: llmResponse.competitors,
      gaps: llmResponse.gaps,
      signalCount: 1,
      createdAt: new Date().toISOString(),
    };
    const repo = makeRepo(existing);
    const llm = makeLLM();
    const useCase = new AnalyzeCompetitorsUseCase(repo, makeSignalRepo(), llm);

    const result = await useCase.execute({ ideaId, ideaText: 'idea validation tool', userId, traceId: 'trace-2' });

    expect(result.isOk()).toBe(true);
    expect(llm.analyzeCompetitors).not.toHaveBeenCalled();
  });

  it('works with zero signals — returns empty competitors list from LLM', async () => {
    const emptyResponse: LLMCompetitorResponse = { competitors: [], gaps: [] };
    const useCase = new AnalyzeCompetitorsUseCase(makeRepo(), makeSignalRepo([]), makeLLM(emptyResponse));

    const result = await useCase.execute({ ideaId, ideaText: 'very niche idea', userId, traceId: 'trace-3' });

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.signalCount).toBe(0);
    expect(result.value.competitors).toHaveLength(0);
  });

  it('propagates LLM error', async () => {
    const llmError = new LLMClientError('timeout');
    const llm: ILLMClient = {
      generateSearchQueries: vi.fn(), scoreSignalRelevance: vi.fn(), generateDecision: vi.fn(),
      generateSimulation: vi.fn(), generateLanding: vi.fn(),
      analyzeCustomers: vi.fn(), analyzeBuild: vi.fn(),
      analyzeCompetitors: vi.fn().mockResolvedValue(err(llmError)),
      chatWithOtto: vi.fn(),
    generateLaunchKit: vi.fn(),
    generatePriorityExplanation: vi.fn(),
    };
    const useCase = new AnalyzeCompetitorsUseCase(makeRepo(), makeSignalRepo(), llm);

    const result = await useCase.execute({ ideaId, ideaText: 'idea validation tool', userId, traceId: 'trace-4' });

    expect(result.isErr()).toBe(true);
    if (!result.isErr()) return;
    expect(result.error).toBeInstanceOf(LLMClientError);
  });

  it('propagates repo save error', async () => {
    const repoError = new CompetitorAnalysisRepositoryError('db down');
    const repo: ICompetitorAnalysisRepository = {
      save: vi.fn().mockResolvedValue(err(repoError)),
      findByIdeaId: vi.fn().mockResolvedValue(ok(null)),
    };
    const useCase = new AnalyzeCompetitorsUseCase(repo, makeSignalRepo(), makeLLM());

    const result = await useCase.execute({ ideaId, ideaText: 'idea validation tool', userId, traceId: 'trace-5' });

    expect(result.isErr()).toBe(true);
    if (!result.isErr()) return;
    expect(result.error).toBeInstanceOf(CompetitorAnalysisRepositoryError);
  });
});
