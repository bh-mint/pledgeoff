import { describe, it, expect, vi } from 'vitest';
import { ok, err } from 'neverthrow';
import { GenerateLandingUseCase } from '../generate-landing';
import { LLMClientError } from '../../ports/llm-client';
import { LandingPageRepositoryError } from '../../ports/landing-page-repository';
import type { ILandingPageRepository } from '../../ports/landing-page-repository';
import type { ILLMClient, LLMLandingResponse } from '../../ports/llm-client';
import type { LandingPage } from '../../domain/landing-page';

const ideaId = crypto.randomUUID();
const userId = crypto.randomUUID();

const llmResponse: LLMLandingResponse = {
  headline: 'Validate your startup idea in 15 seconds',
  subheadline: 'Get a GO / KILL / PIVOT verdict backed by real Reddit and GitHub signals.',
  features: ['Real market signals', 'AI-powered verdict', 'No guesswork'],
  ctaText: 'Start free →',
  waitlistHeadline: 'Join 500+ founders validating smarter',
};

function makeLandingRepo(existing: LandingPage | null = null): ILandingPageRepository {
  return {
    save: vi.fn().mockImplementation((p) => Promise.resolve(ok(p))),
    findByIdeaId: vi.fn().mockResolvedValue(ok(existing)),
  };
}

function makeLLMClient(response = llmResponse): ILLMClient {
  return {
    generateSearchQueries: vi.fn(), scoreSignalRelevance: vi.fn(), generateDecision: vi.fn(),
    generateSimulation: vi.fn(),
    generateLanding: vi.fn().mockResolvedValue(ok(response)),
    analyzeCustomers: vi.fn(), analyzeBuild: vi.fn(), analyzeCompetitors: vi.fn(),
  };
}

const baseInput = {
  ideaId,
  ideaText: 'A SaaS tool for startup founders to validate ideas',
  reasoning: 'Strong demand from indie hackers and solo founders on Reddit.',
  userId,
  traceId: crypto.randomUUID(),
};

describe('GenerateLandingUseCase', () => {
  it('generates and persists a landing page', async () => {
    const useCase = new GenerateLandingUseCase(makeLandingRepo(), makeLLMClient());
    const result = await useCase.execute(baseInput);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.ideaId).toBe(ideaId);
      expect(result.value.headline).toBe(llmResponse.headline);
      expect(result.value.features).toHaveLength(3);
    }
  });

  it('returns cached landing page when one already exists', async () => {
    const existing: LandingPage = {
      id: crypto.randomUUID(), ideaId, userId,
      headline: 'Cached headline', subheadline: 'Cached sub',
      features: ['Feature 1'], ctaText: 'Go →', waitlistHeadline: 'Join',
      createdAt: new Date().toISOString(),
    };
    const llm = makeLLMClient();
    const useCase = new GenerateLandingUseCase(makeLandingRepo(existing), llm);

    const result = await useCase.execute(baseInput);

    expect(result.isOk()).toBe(true);
    expect(llm.generateLanding).not.toHaveBeenCalled();
    if (result.isOk()) expect(result.value.id).toBe(existing.id);
  });

  it('returns LLM error when LLM call fails', async () => {
    const llm: ILLMClient = {
      generateSearchQueries: vi.fn(), scoreSignalRelevance: vi.fn(), generateDecision: vi.fn(),
      generateSimulation: vi.fn(),
      generateLanding: vi.fn().mockResolvedValue(err(new LLMClientError('timeout'))),
      analyzeCustomers: vi.fn(), analyzeBuild: vi.fn(), analyzeCompetitors: vi.fn(),
    };
    const useCase = new GenerateLandingUseCase(makeLandingRepo(), llm);

    const result = await useCase.execute(baseInput);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toBeInstanceOf(LLMClientError);
  });

  it('returns repo error when save fails', async () => {
    const repo: ILandingPageRepository = {
      save: vi.fn().mockResolvedValue(err(new LandingPageRepositoryError('DB down'))),
      findByIdeaId: vi.fn().mockResolvedValue(ok(null)),
    };
    const useCase = new GenerateLandingUseCase(repo, makeLLMClient());

    const result = await useCase.execute(baseInput);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toBeInstanceOf(LandingPageRepositoryError);
  });
});
