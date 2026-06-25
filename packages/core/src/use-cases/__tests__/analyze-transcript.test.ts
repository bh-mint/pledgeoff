import { describe, it, expect, vi } from 'vitest';
import { ok, err } from 'neverthrow';
import { AnalyzeTranscriptUseCase } from '../analyze-transcript';
import { LLMClientError } from '../../ports/llm-client';
import { TranscriptAnalysisRepositoryError } from '../../ports/ITranscriptAnalysisRepository';
import type { ITranscriptAnalysisRepository } from '../../ports/ITranscriptAnalysisRepository';
import type { IInterviewGuideRepository } from '../../ports/IInterviewGuideRepository';
import type { ILLMClient, LLMTranscriptResponse } from '../../ports/llm-client';
import type { InterviewGuide } from '../../domain/interview-guide';

const ideaId = crypto.randomUUID();
const userId = crypto.randomUUID();
const transcript = 'Interviewer: How do you validate ideas? User: We mostly ask our network...';

const llmResponse: LLMTranscriptResponse = {
  confirmedHypotheses: ['Founders waste time on manual research'],
  rejectedHypotheses: ['Founders pay for validation tools'],
  newInsights: ['Network bias is a major blind spot'],
  quotes: [
    { text: 'We mostly ask our network', sentiment: 'neutral', theme: 'validation method' },
  ],
  signalStrength: 'moderate',
};

function makeRepo(): ITranscriptAnalysisRepository {
  return {
    save: vi.fn().mockImplementation((a) => Promise.resolve(ok(a))),
    findByIdeaId: vi.fn().mockResolvedValue(ok(null)),
  };
}

function makeGuideRepo(guide: InterviewGuide | null = null): IInterviewGuideRepository {
  return {
    save: vi.fn(),
    findByIdeaId: vi.fn().mockResolvedValue(ok(guide)),
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
    generateInterviewGuide: vi.fn(),
    analyzeTranscript: vi.fn().mockResolvedValue(ok(response)),
  };
}

describe('AnalyzeTranscriptUseCase', () => {
  it('analyzes transcript and persists result', async () => {
    const repo = makeRepo();
    const useCase = new AnalyzeTranscriptUseCase(makeLLM(), repo, makeGuideRepo());

    const result = await useCase.execute({ ideaId, userId, ideaText: 'AI validator', transcript, traceId: 'trace-1' });

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.confirmedHypotheses).toHaveLength(1);
    expect(result.value.rejectedHypotheses).toHaveLength(1);
    expect(result.value.newInsights).toHaveLength(1);
    expect(result.value.quotes).toHaveLength(1);
    expect(result.value.signalStrength).toBe('moderate');
    expect(repo.save).toHaveBeenCalledOnce();
  });

  it('passes hypotheses from interview guide to LLM', async () => {
    const guide: InterviewGuide = {
      id: crypto.randomUUID(), ideaId, userId,
      targetSegment: 'B2B founders',
      questions: [{ question: 'Q1', purpose: 'P1' }],
      hypotheses: ['H1', 'H2'],
      redFlags: [],
      createdAt: new Date().toISOString(),
    };
    const llm = makeLLM();
    const useCase = new AnalyzeTranscriptUseCase(llm, makeRepo(), makeGuideRepo(guide));

    await useCase.execute({ ideaId, userId, ideaText: 'idea', transcript, traceId: 'trace-1' });

    expect(llm.analyzeTranscript).toHaveBeenCalledWith(
      expect.objectContaining({ hypotheses: ['H1', 'H2'] }),
    );
  });

  it('passes empty hypotheses when no interview guide exists', async () => {
    const llm = makeLLM();
    const useCase = new AnalyzeTranscriptUseCase(llm, makeRepo(), makeGuideRepo(null));

    await useCase.execute({ ideaId, userId, ideaText: 'idea', transcript, traceId: 'trace-1' });

    expect(llm.analyzeTranscript).toHaveBeenCalledWith(
      expect.objectContaining({ hypotheses: [] }),
    );
  });

  it('returns error when LLM fails', async () => {
    const llm = makeLLM();
    llm.analyzeTranscript = vi.fn().mockResolvedValue(err(new LLMClientError('timeout')));
    const useCase = new AnalyzeTranscriptUseCase(llm, makeRepo(), makeGuideRepo());

    const result = await useCase.execute({ ideaId, userId, ideaText: 'idea', transcript, traceId: 'trace-1' });

    expect(result.isErr()).toBe(true);
  });

  it('returns error when repo save fails', async () => {
    const repo = makeRepo();
    repo.save = vi.fn().mockResolvedValue(err(new TranscriptAnalysisRepositoryError('DB error')));
    const useCase = new AnalyzeTranscriptUseCase(makeLLM(), repo, makeGuideRepo());

    const result = await useCase.execute({ ideaId, userId, ideaText: 'idea', transcript, traceId: 'trace-1' });

    expect(result.isErr()).toBe(true);
  });
});
