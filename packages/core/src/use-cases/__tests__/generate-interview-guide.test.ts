import { describe, it, expect, vi } from 'vitest';
import { ok, err } from 'neverthrow';
import { GenerateInterviewGuideUseCase } from '../generate-interview-guide';
import { LLMClientError } from '../../ports/llm-client';
import { InterviewGuideRepositoryError } from '../../ports/IInterviewGuideRepository';
import type { IInterviewGuideRepository } from '../../ports/IInterviewGuideRepository';
import type { ICustomerAnalysisRepository } from '../../ports/customer-analysis-repository';
import type { ILLMClient, LLMInterviewGuideResponse } from '../../ports/llm-client';
import type { InterviewGuide } from '../../domain/interview-guide';
import type { CustomerAnalysis } from '../../domain/customer-analysis';

const ideaId = crypto.randomUUID();
const userId = crypto.randomUUID();

const llmResponse: LLMInterviewGuideResponse = {
  targetSegment: 'B2B SaaS founders at pre-seed stage',
  questions: [
    { question: 'How do you currently validate ideas?', purpose: 'Understand baseline process', followUp: 'How long does it take?' },
    { question: 'What was your last failed product?', purpose: 'Identify validation gaps' },
  ],
  hypotheses: ['Founders waste >2 weeks on manual research', 'Signal quality matters more than volume'],
  redFlags: ['User says they validate with friends/family only', 'No prior failed product experience'],
};

function makeRepo(existing: InterviewGuide | null = null): IInterviewGuideRepository {
  return {
    save: vi.fn().mockImplementation((g) => Promise.resolve(ok(g))),
    findByIdeaId: vi.fn().mockResolvedValue(ok(existing)),
  };
}

function makeCustomerRepo(analysis: CustomerAnalysis | null = null): ICustomerAnalysisRepository {
  return {
    save: vi.fn(),
    findByIdeaId: vi.fn().mockResolvedValue(ok(analysis)),
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
    generateMarketLandscape: vi.fn(),
    generateInterviewGuide: vi.fn().mockResolvedValue(ok(response)),
    analyzeTranscript: vi.fn(),
  };
}

describe('GenerateInterviewGuideUseCase', () => {
  it('generates and persists interview guide', async () => {
    const repo = makeRepo();
    const llm = makeLLM();
    const useCase = new GenerateInterviewGuideUseCase(llm, repo, makeCustomerRepo());

    const result = await useCase.execute({ ideaId, userId, ideaText: 'AI idea validator', traceId: 'trace-1' });

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.questions).toHaveLength(2);
    expect(result.value.hypotheses).toHaveLength(2);
    expect(result.value.redFlags).toHaveLength(2);
    expect(result.value.targetSegment).toBe('B2B SaaS founders at pre-seed stage');
    expect(repo.save).toHaveBeenCalledOnce();
  });

  it('passes ICP segments to LLM when customer analysis exists', async () => {
    const analysis = {
      id: crypto.randomUUID(), ideaId, userId,
      segments: [{ name: 'Early adopters', description: '', size: 'small' as const, willingnessToPay: 'high' as const }],
      painPoints: [], sentiment: { positive: 0, neutral: 0, negative: 0 }, quotes: [],
      createdAt: new Date().toISOString(),
    };
    const llm = makeLLM();
    const useCase = new GenerateInterviewGuideUseCase(llm, makeRepo(), makeCustomerRepo(analysis));

    await useCase.execute({ ideaId, userId, ideaText: 'idea', traceId: 'trace-1' });

    expect(llm.generateInterviewGuide).toHaveBeenCalledWith(
      expect.objectContaining({ icpSegments: ['Early adopters'] }),
    );
  });

  it('returns error when LLM fails', async () => {
    const llm = makeLLM();
    llm.generateInterviewGuide = vi.fn().mockResolvedValue(err(new LLMClientError('timeout')));
    const useCase = new GenerateInterviewGuideUseCase(llm, makeRepo(), makeCustomerRepo());

    const result = await useCase.execute({ ideaId, userId, ideaText: 'idea', traceId: 'trace-1' });

    expect(result.isErr()).toBe(true);
  });

  it('returns error when repo save fails', async () => {
    const repo = makeRepo();
    repo.save = vi.fn().mockResolvedValue(err(new InterviewGuideRepositoryError('DB error')));
    const useCase = new GenerateInterviewGuideUseCase(makeLLM(), repo, makeCustomerRepo());

    const result = await useCase.execute({ ideaId, userId, ideaText: 'idea', traceId: 'trace-1' });

    expect(result.isErr()).toBe(true);
  });
});
