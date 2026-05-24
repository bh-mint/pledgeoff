import { describe, it, expect, vi } from 'vitest';
import { ok, err } from 'neverthrow';
import { GenerateLaunchKitUseCase } from '../generate-launch-kit';
import { IdeaRepositoryError, type IIdeaRepository } from '../../ports/idea-repository';
import { SignalRepositoryError, type ISignalRepository } from '../../ports/signal-repository';
import { LaunchKitRepositoryError, type ILaunchKitRepository } from '../../ports/launch-kit-repository';
import { LLMClientError, type ILLMClient, type LLMLaunchKitResponse } from '../../ports/llm-client';
import type { Idea } from '../../domain/idea';
import type { LaunchKit } from '../../domain/launch-kit';

const userId = crypto.randomUUID();
const ideaId = crypto.randomUUID();

const mockIdea: Idea = {
  id: ideaId,
  userId,
  text: 'A great SaaS idea for testing',
  niche: 'saas_b2b',
  createdAt: new Date().toISOString(),
};

const mockLlmResponse: LLMLaunchKitResponse = {
  headlines: [
    { variant: 'A', headline: 'Ship faster, validate smarter', angle: 'Speed' },
    { variant: 'B', headline: 'Know before you build', angle: 'Risk reduction' },
    { variant: 'C', headline: 'Decisions backed by real data', angle: 'Confidence' },
  ],
  emailSequence: [
    { sequence: 1, subject: 'Welcome to the waitlist', body: 'Thanks for joining...', sendAt: 'Immediately' },
    { sequence: 2, subject: 'Here is what we are building', body: 'A quick update...', sendAt: '3 days after signup' },
    { sequence: 3, subject: 'Early access is live', body: 'Your spot is ready...', sendAt: '7 days after signup' },
  ],
  pricingRecommendation: {
    tier: 'Pro',
    priceMonthly: 49,
    currency: 'USD',
    rationale: 'Competitive with similar tools in the space',
    anchoring: 'Start at $49/mo — equivalent to 2 hours of founder time',
  },
};

function makeIdeaRepo(idea: Idea | null = mockIdea): IIdeaRepository {
  return {
    save: vi.fn(),
    findById: vi.fn().mockResolvedValue(ok(idea)),
    findByUserId: vi.fn(),
    findByUserIds: vi.fn(),
    countThisMonth: vi.fn(),
  };
}

function makeSignalRepo(): ISignalRepository {
  return {
    upsertMany: vi.fn(),
    findByIdeaId: vi.fn().mockResolvedValue(ok([])),
    findTopByEmbedding: vi.fn(),
    saveEmbeddings: vi.fn(),
  };
}

function makeLaunchKitRepo(existing: LaunchKit | null = null): ILaunchKitRepository {
  return {
    save: vi.fn().mockImplementation(async (kit: LaunchKit) => ok(kit)),
    findByIdeaId: vi.fn().mockResolvedValue(ok(existing)),
  };
}

function makeLlmClient(response: LLMLaunchKitResponse = mockLlmResponse): ILLMClient {
  return {
    generateSearchQueries: vi.fn(),
    scoreSignalRelevance: vi.fn(),
    generateDecision: vi.fn(),
    generateSimulation: vi.fn(),
    generateLanding: vi.fn(),
    analyzeCustomers: vi.fn(),
    analyzeBuild: vi.fn(),
    analyzeCompetitors: vi.fn(),
    chatWithOtto: vi.fn(),
    generateLaunchKit: vi.fn().mockResolvedValue(ok(response)),
    generatePriorityExplanation: vi.fn(),
  };
}

const baseInput = { ideaId, userId, traceId: crypto.randomUUID() };

describe('GenerateLaunchKitUseCase', () => {
  it('generates a launch kit and saves it', async () => {
    const uc = new GenerateLaunchKitUseCase(makeIdeaRepo(), makeSignalRepo(), makeLaunchKitRepo(), makeLlmClient());
    const result = await uc.execute(baseInput);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.ideaId).toBe(ideaId);
      expect(result.value.headlines).toHaveLength(3);
      expect(result.value.emailSequence).toHaveLength(3);
      expect(result.value.pricingRecommendation.priceMonthly).toBe(49);
    }
  });

  it('returns cached kit when already exists', async () => {
    const existing: LaunchKit = {
      id: crypto.randomUUID(),
      ideaId,
      userId,
      headlines: mockLlmResponse.headlines,
      emailSequence: mockLlmResponse.emailSequence,
      pricingRecommendation: mockLlmResponse.pricingRecommendation,
      createdAt: new Date().toISOString(),
    };
    const llm = makeLlmClient();
    const uc = new GenerateLaunchKitUseCase(makeIdeaRepo(), makeSignalRepo(), makeLaunchKitRepo(existing), llm);
    await uc.execute(baseInput);
    expect(llm.generateLaunchKit).not.toHaveBeenCalled();
  });

  it('returns UNAUTHORIZED when idea belongs to different user', async () => {
    const otherUser = crypto.randomUUID();
    const uc = new GenerateLaunchKitUseCase(
      makeIdeaRepo({ ...mockIdea, userId: otherUser }),
      makeSignalRepo(),
      makeLaunchKitRepo(),
      makeLlmClient(),
    );
    const result = await uc.execute(baseInput);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('returns IDEA_NOT_FOUND when idea does not exist', async () => {
    const uc = new GenerateLaunchKitUseCase(
      makeIdeaRepo(null),
      makeSignalRepo(),
      makeLaunchKitRepo(),
      makeLlmClient(),
    );
    const result = await uc.execute(baseInput);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toMatchObject({ code: 'IDEA_NOT_FOUND' });
  });

  it('propagates idea repo error', async () => {
    const ideaRepo = makeIdeaRepo();
    ideaRepo.findById = vi.fn().mockResolvedValue(err(new IdeaRepositoryError('DB down')));
    const uc = new GenerateLaunchKitUseCase(ideaRepo, makeSignalRepo(), makeLaunchKitRepo(), makeLlmClient());
    const result = await uc.execute(baseInput);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toBeInstanceOf(IdeaRepositoryError);
  });

  it('propagates signal repo error', async () => {
    const signalRepo = makeSignalRepo();
    signalRepo.findByIdeaId = vi.fn().mockResolvedValue(err(new SignalRepositoryError('DB down')));
    const uc = new GenerateLaunchKitUseCase(makeIdeaRepo(), signalRepo, makeLaunchKitRepo(), makeLlmClient());
    const result = await uc.execute(baseInput);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toBeInstanceOf(SignalRepositoryError);
  });

  it('propagates LLM error', async () => {
    const llm = makeLlmClient();
    llm.generateLaunchKit = vi.fn().mockResolvedValue(err(new LLMClientError('LLM timeout')));
    const uc = new GenerateLaunchKitUseCase(makeIdeaRepo(), makeSignalRepo(), makeLaunchKitRepo(), llm);
    const result = await uc.execute(baseInput);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toBeInstanceOf(LLMClientError);
  });

  it('propagates launch kit repo save error', async () => {
    const repo = makeLaunchKitRepo();
    repo.save = vi.fn().mockResolvedValue(err(new LaunchKitRepositoryError('write failed')));
    const uc = new GenerateLaunchKitUseCase(makeIdeaRepo(), makeSignalRepo(), repo, makeLlmClient());
    const result = await uc.execute(baseInput);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toBeInstanceOf(LaunchKitRepositoryError);
  });
});
