import { err, ok, Result } from 'neverthrow';
import { appendMessage, createOttoConversation } from '../domain/otto-conversation';
import { canAskOtto, effectivePlan, ottoAvailableQuestions } from '../domain/subscription';
import type { IOttoConversationRepository } from '../ports/otto-conversation-repository';
import type { ISubscriptionRepository } from '../ports/subscription-repository';
import type { ILLMClient } from '../ports/llm-client';
import type { OttoConversation } from '../domain/otto-conversation';

export class OttoInsufficientQuestionsError extends Error {
  readonly code = 'OTTO_INSUFFICIENT_QUESTIONS' as const;
}

export class OttoUnavailableError extends Error {
  readonly code = 'OTTO_UNAVAILABLE' as const;
}

export class OttoRepositoryError extends Error {
  readonly code = 'OTTO_REPOSITORY_ERROR' as const;
}

export type AskOttoError =
  | OttoInsufficientQuestionsError
  | OttoUnavailableError
  | OttoRepositoryError;

export type AskOttoInput = {
  userId: string;
  ideaId: string;
  ideaText: string;
  verdict: string;
  reasoning: string;
  score: number;
  userMessage: string;
  traceId: string;
};

export type AskOttoOutput = {
  reply: string;
  conversation: OttoConversation;
  balance: { included: number; purchased: number; total: number };
};

export class AskOttoUseCase {
  constructor(
    private readonly ottoConversationRepo: IOttoConversationRepository,
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly llmClient: ILLMClient,
  ) {}

  async execute(input: AskOttoInput): Promise<Result<AskOttoOutput, AskOttoError>> {
    const subResult = await this.subscriptionRepo.findByUserId(input.userId);
    if (subResult.isErr()) return err(new OttoRepositoryError('Failed to load subscription'));

    const sub = subResult.value;
    const plan = sub ? effectivePlan(sub) : 'free';

    if (plan === 'free' || !sub) {
      return err(new OttoInsufficientQuestionsError('Upgrade to Pro to use Otto'));
    }

    if (!canAskOtto(sub)) {
      return err(new OttoInsufficientQuestionsError('No Otto questions remaining'));
    }

    const convResult = await this.ottoConversationRepo.findByUserAndIdea(input.userId, input.ideaId);
    if (convResult.isErr()) return err(new OttoRepositoryError('Failed to load conversation'));

    const conversation = convResult.value ?? createOttoConversation(input.userId, input.ideaId);

    // Deduct before LLM — credit is consumed regardless of LLM outcome.
    // If LLM fails after this point, credit is intentionally lost (prevents credit farming via retries).
    const deductResult = await this.subscriptionRepo.deductOttoQuestion(input.userId);
    if (deductResult.isErr()) return err(new OttoRepositoryError('Failed to deduct question'));

    const llmResult = await this.llmClient.chatWithOtto({
      ideaText: input.ideaText,
      verdict: input.verdict,
      reasoning: input.reasoning,
      score: input.score,
      history: conversation.messages.map((m) => ({ role: m.role, content: m.content })),
      userMessage: input.userMessage,
      traceId: input.traceId,
      userId: input.userId,
    });

    if (llmResult.isErr()) return err(new OttoUnavailableError('LLM call failed'));

    const { reply } = llmResult.value;

    const withUserMsg = appendMessage(conversation, 'user', input.userMessage);
    const withReply = appendMessage(withUserMsg, 'assistant', reply);

    const saveResult = await this.ottoConversationRepo.save(withReply);
    if (saveResult.isErr()) return err(new OttoRepositoryError('Failed to save conversation'));

    const freshSubResult = await this.subscriptionRepo.findByUserId(input.userId);
    const freshSub = freshSubResult.isOk() && freshSubResult.value ? freshSubResult.value : sub;
    const balance = ottoAvailableQuestions(freshSub);

    return ok({ reply, conversation: saveResult.value, balance });
  }
}
