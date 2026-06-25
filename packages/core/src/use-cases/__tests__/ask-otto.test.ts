import { describe, it, expect, vi } from 'vitest';
import { ok, err } from 'neverthrow';
import { AskOttoUseCase, OttoInsufficientQuestionsError, OttoUnavailableError } from '../ask-otto';
import type { IOttoConversationRepository } from '../../ports/otto-conversation-repository';
import type { ISubscriptionRepository } from '../../ports/subscription-repository';
import type { ILLMClient } from '../../ports/llm-client';
import { LLMClientError } from '../../ports/llm-client';
import type { Subscription } from '../../domain/subscription';

const makeProSub = (overrides: Partial<Subscription> = {}): Subscription => ({
  id: 'sub-1',
  userId: 'user-1',
  stripeCustomerId: 'cus_1',
  stripeSubscriptionId: 'sub_stripe_1',
  plan: 'founder',
  status: 'active',
  currentPeriodEnd: null,
  extraSeats: 0,
  stripeExtraSeatItemId: null,
  pastDueSince: null,
  ottoIncludedUsed: 0,
  ottoIncludedResetAt: null,
  ottoPurchased: 0,
  verificationsPurchased: 0,
  adminOverride: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const makeInput = () => ({
  userId: 'user-1',
  ideaId: 'idea-1',
  ideaText: 'A SaaS for developers',
  verdict: 'GO',
  reasoning: 'Strong market signals',
  score: 82,
  userMessage: 'What should I build first?',
  traceId: 'trace-1',
});

function makeRepos(subOverride?: Partial<Subscription>) {
  const sub = makeProSub(subOverride);
  const ottoRepo: IOttoConversationRepository = {
    findByUserAndIdea: vi.fn().mockResolvedValue(ok(null)),
    save: vi.fn().mockImplementation((conv) => Promise.resolve(ok(conv))),
  };

  const subRepo: ISubscriptionRepository = {
    findByUserId: vi.fn().mockResolvedValue(ok(sub)),
    findByStripeCustomerId: vi.fn(),
    findByStripeSubscriptionId: vi.fn(),
    findPastDueForRetry: vi.fn(),
    upsert: vi.fn(),
    updatePlan: vi.fn(),
    updateExtraSeats: vi.fn(),
    setPastDueSince: vi.fn(),
    downgradeToFree: vi.fn(),
    deductOttoQuestion: vi.fn().mockResolvedValue(ok(undefined)),
    deductVerification: vi.fn().mockResolvedValue(ok(undefined)),
    addOttoPurchasedQuestions: vi.fn(),
    addVerificationsPurchased: vi.fn(),
    resetOttoIncludedUsed: vi.fn(),
    resetAllOttoIncludedUsed: vi.fn(),
    setAdminOverride: vi.fn(),
  };

  const llm: ILLMClient = {
    generateSearchQueries: vi.fn(),
    scoreSignalRelevance: vi.fn(),
    generateDecision: vi.fn(),
    generateSimulation: vi.fn(),
    generateLanding: vi.fn(),
    analyzeCustomers: vi.fn(),
    analyzeBuild: vi.fn(),
    analyzeCompetitors: vi.fn(),
    chatWithOtto: vi.fn().mockResolvedValue(ok({ reply: 'Build the auth module first.' })),
    generateLaunchKit: vi.fn(),
    generatePriorityExplanation: vi.fn(),
    analyzeFeatures: vi.fn(),
    generateBattlecard: vi.fn(),
    generateMarketLandscape: vi.fn(),
  };

  return { ottoRepo, subRepo, llm };
}

describe('AskOttoUseCase', () => {
  it('returns reply and updated conversation for Pro user with questions remaining', async () => {
    const { ottoRepo, subRepo, llm } = makeRepos();
    const useCase = new AskOttoUseCase(ottoRepo, subRepo, llm);

    const result = await useCase.execute(makeInput());

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.reply).toBe('Build the auth module first.');
      expect(result.value.conversation.messages).toHaveLength(2);
      expect(result.value.conversation.messages[0]?.role).toBe('user');
      expect(result.value.conversation.messages[1]?.role).toBe('assistant');
    }
  });

  it('deducts a question after successful reply', async () => {
    const { ottoRepo, subRepo, llm } = makeRepos();
    const useCase = new AskOttoUseCase(ottoRepo, subRepo, llm);

    await useCase.execute(makeInput());

    expect(subRepo.deductOttoQuestion).toHaveBeenCalledWith('user-1', 15); // founder = 15
  });

  it('rejects Free plan users with OttoInsufficientQuestionsError', async () => {
    const { ottoRepo, subRepo, llm } = makeRepos({ plan: 'free', status: 'active' });
    const useCase = new AskOttoUseCase(ottoRepo, subRepo, llm);

    const result = await useCase.execute(makeInput());

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(OttoInsufficientQuestionsError);
  });

  it('rejects when included questions exhausted and no purchased questions', async () => {
    const { ottoRepo, subRepo, llm } = makeRepos({ ottoIncludedUsed: 15, ottoPurchased: 0 });
    const useCase = new AskOttoUseCase(ottoRepo, subRepo, llm);

    const result = await useCase.execute(makeInput());

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(OttoInsufficientQuestionsError);
  });

  it('allows asking when included exhausted but purchased questions remain', async () => {
    const { ottoRepo, subRepo, llm } = makeRepos({ ottoIncludedUsed: 3, ottoPurchased: 2 });
    const useCase = new AskOttoUseCase(ottoRepo, subRepo, llm);

    const result = await useCase.execute(makeInput());

    expect(result.isOk()).toBe(true);
  });

  it('returns OttoUnavailableError when LLM fails', async () => {
    const { ottoRepo, subRepo, llm } = makeRepos();
    vi.mocked(llm.chatWithOtto).mockResolvedValueOnce(err(new LLMClientError('timeout')));
    const useCase = new AskOttoUseCase(ottoRepo, subRepo, llm);

    const result = await useCase.execute(makeInput());

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(OttoUnavailableError);
  });

  it('appends to existing conversation history', async () => {
    const { ottoRepo, subRepo, llm } = makeRepos();
    const existingConv = {
      id: 'conv-1',
      userId: 'user-1',
      ideaId: 'idea-1',
      messages: [
        { role: 'user' as const, content: 'Previous question', createdAt: new Date().toISOString() },
        { role: 'assistant' as const, content: 'Previous answer', createdAt: new Date().toISOString() },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    vi.mocked(ottoRepo.findByUserAndIdea).mockResolvedValueOnce(ok(existingConv));
    const useCase = new AskOttoUseCase(ottoRepo, subRepo, llm);

    const result = await useCase.execute(makeInput());

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.conversation.messages).toHaveLength(4);
    }
  });

  it('deducts question before LLM call — credit consumed even when LLM fails', async () => {
    const { ottoRepo, subRepo, llm } = makeRepos();
    vi.mocked(llm.chatWithOtto).mockResolvedValueOnce(err(new LLMClientError('timeout')));
    const useCase = new AskOttoUseCase(ottoRepo, subRepo, llm);

    const result = await useCase.execute(makeInput());

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(OttoUnavailableError);
    // Credit is consumed before LLM — prevents gaming the system via retries
    expect(subRepo.deductOttoQuestion).toHaveBeenCalledWith('user-1', 15); // founder = 15
  });
});
