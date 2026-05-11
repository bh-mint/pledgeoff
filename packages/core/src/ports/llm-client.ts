import { Result } from 'neverthrow';
import type { Signal } from '../domain/signal';
import type { Verdict, Dimension } from '../domain/decision';
import type { SimulationScenario } from '../domain/simulation';

export interface LLMDecisionRequest {
  readonly ideaText: string;
  readonly signals: Signal[];
  readonly traceId: string;
}

export interface LLMDecisionResponse {
  readonly verdict: Verdict;
  readonly reasoning: string;
  readonly confidence: number;
  readonly dimensions?: Dimension[];
}

export interface LLMSimulationRequest {
  readonly ideaText: string;
  readonly signals: Signal[];
  readonly verdict: Verdict;
  readonly traceId: string;
}

export interface LLMSimulationResponse {
  readonly tamLow: number;
  readonly tamHigh: number;
  readonly scenarios: SimulationScenario[];
  readonly breakEvenMonths: number;
  readonly assumptions: string[];
}

export class LLMClientError extends Error {
  readonly code = 'LLM_CLIENT_ERROR' as const;
}

export interface ILLMClient {
  generateDecision(request: LLMDecisionRequest): Promise<Result<LLMDecisionResponse, LLMClientError>>;
  generateSimulation(request: LLMSimulationRequest): Promise<Result<LLMSimulationResponse, LLMClientError>>;
}
