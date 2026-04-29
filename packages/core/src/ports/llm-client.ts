import { Result } from 'neverthrow';
import type { Signal } from '../domain/signal.js';
import type { Verdict } from '../domain/decision.js';

export interface LLMDecisionRequest {
  readonly ideaText: string;
  readonly signals: Signal[];
  readonly traceId: string;
}

export interface LLMDecisionResponse {
  readonly verdict: Verdict;
  readonly reasoning: string;
  readonly confidence: number;
}

export class LLMClientError extends Error {
  readonly code = 'LLM_CLIENT_ERROR' as const;
}

export interface ILLMClient {
  generateDecision(request: LLMDecisionRequest): Promise<Result<LLMDecisionResponse, LLMClientError>>;
}
