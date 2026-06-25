import { describe, it, expect, vi } from 'vitest';
import { ok, err } from 'neverthrow';
import { SimulateRevenueUseCase } from '../simulate-revenue';
import { LLMClientError } from '../../ports/llm-client';
import { SimulationRepositoryError } from '../../ports/simulation-repository';
import type { ISimulationRepository } from '../../ports/simulation-repository';
import type { ISignalRepository } from '../../ports/signal-repository';
import type { ILLMClient, LLMSimulationResponse } from '../../ports/llm-client';
import type { Signal } from '../../domain/signal';
import type { Simulation } from '../../domain/simulation';

const ideaId = crypto.randomUUID();
const userId = crypto.randomUUID();

const makeSignal = (): Signal => ({
  id: crypto.randomUUID(),
  ideaId,
  source: 'reddit',
  url: 'https://reddit.com/r/startups/comments/abc',
  title: 'People want this',
  summary: 'Strong interest',
  sentiment: 'positive',
  fetchedAt: new Date().toISOString(),
});

const llmResponse: LLMSimulationResponse = {
  tamLow: 5_000_000,
  tamHigh: 50_000_000,
  scenarios: [
    { name: 'conservative', pricePerUser: 9, mrr6: 900, mrr12: 2700, mrr24: 5400 },
    { name: 'moderate', pricePerUser: 19, mrr6: 3800, mrr12: 9500, mrr24: 19000 },
    { name: 'optimistic', pricePerUser: 49, mrr6: 14700, mrr12: 49000, mrr24: 98000 },
  ],
  breakEvenMonths: 8,
  assumptions: ['B2C SaaS', 'Self-serve growth', 'No sales team'],
};

function makeSimulationRepo(existing: Simulation | null = null): ISimulationRepository {
  return {
    save: vi.fn().mockImplementation((s) => Promise.resolve(ok(s))),
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

function makeLLMClient(response = llmResponse): ILLMClient {
  return {
    generateSearchQueries: vi.fn(), scoreSignalRelevance: vi.fn(), generateDecision: vi.fn(),
    generateSimulation: vi.fn().mockResolvedValue(ok(response)),
    generateLanding: vi.fn(),
    analyzeCustomers: vi.fn(), analyzeBuild: vi.fn(), analyzeCompetitors: vi.fn(),
    chatWithOtto: vi.fn(),
    generateLaunchKit: vi.fn(),
    generatePriorityExplanation: vi.fn(),
    analyzeFeatures: vi.fn(),
    generateBattlecard: vi.fn(),
  };
}

const baseInput = {
  ideaId,
  ideaText: 'A SaaS tool for startup founders',
  verdict: 'GO' as const,
  userId,
  traceId: crypto.randomUUID(),
};

describe('SimulateRevenueUseCase', () => {
  it('generates and persists a simulation', async () => {
    const useCase = new SimulateRevenueUseCase(makeSimulationRepo(), makeSignalRepo(), makeLLMClient());
    const result = await useCase.execute(baseInput);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.ideaId).toBe(ideaId);
      expect(result.value.tamLow).toBe(5_000_000);
      expect(result.value.scenarios).toHaveLength(3);
      expect(result.value.breakEvenMonths).toBe(8);
    }
  });

  it('returns cached simulation when one already exists', async () => {
    const existing: Simulation = {
      id: crypto.randomUUID(),
      ideaId,
      userId,
      tamLow: 1_000_000,
      tamHigh: 10_000_000,
      scenarios: llmResponse.scenarios,
      breakEvenMonths: 12,
      assumptions: [],
      createdAt: new Date().toISOString(),
    };
    const llm = makeLLMClient();
    const useCase = new SimulateRevenueUseCase(makeSimulationRepo(existing), makeSignalRepo(), llm);

    const result = await useCase.execute(baseInput);

    expect(result.isOk()).toBe(true);
    expect(llm.generateSimulation).not.toHaveBeenCalled();
    if (result.isOk()) expect(result.value.id).toBe(existing.id);
  });

  it('returns LLM error when LLM call fails', async () => {
    const llmError = new LLMClientError('LLM timeout');
    const llm: ILLMClient = {
      generateSearchQueries: vi.fn(), scoreSignalRelevance: vi.fn(), generateDecision: vi.fn(),
      generateSimulation: vi.fn().mockResolvedValue(err(llmError)),
      generateLanding: vi.fn(),
      analyzeCustomers: vi.fn(), analyzeBuild: vi.fn(), analyzeCompetitors: vi.fn(),
    chatWithOtto: vi.fn(),
    generateLaunchKit: vi.fn(),
    generatePriorityExplanation: vi.fn(),
    analyzeFeatures: vi.fn(),
    generateBattlecard: vi.fn(),
    };
    const useCase = new SimulateRevenueUseCase(makeSimulationRepo(), makeSignalRepo(), llm);

    const result = await useCase.execute(baseInput);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toBeInstanceOf(LLMClientError);
  });

  it('returns repo error when save fails', async () => {
    const repoError = new SimulationRepositoryError('DB down');
    const repo: ISimulationRepository = {
      save: vi.fn().mockResolvedValue(err(repoError)),
      findByIdeaId: vi.fn().mockResolvedValue(ok(null)),
    };
    const useCase = new SimulateRevenueUseCase(repo, makeSignalRepo(), makeLLMClient());

    const result = await useCase.execute(baseInput);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toBeInstanceOf(SimulationRepositoryError);
  });
});
