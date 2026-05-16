import { Result } from 'neverthrow';
import type { Signal } from '../domain/signal';
import type { Verdict, Dimension } from '../domain/decision';
import type { SimulationScenario } from '../domain/simulation';
import type { CustomerSegment, PainPoint, SentimentBreakdown, CustomerQuote } from '../domain/customer-analysis';
import type { TechComponent, TechGap } from '../domain/build-analysis';
import type { Competitor, CompetitorGap } from '../domain/competitor-analysis';

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

export interface LLMLandingRequest {
  readonly ideaText: string;
  readonly reasoning: string;
  readonly traceId: string;
}

export interface LLMLandingResponse {
  readonly headline: string;
  readonly subheadline: string;
  readonly features: string[];
  readonly ctaText: string;
  readonly waitlistHeadline: string;
}

export interface LLMCustomerRequest {
  readonly ideaText: string;
  readonly signals: Signal[];
  readonly traceId: string;
}

export interface LLMCustomerResponse {
  readonly segments: CustomerSegment[];
  readonly painPoints: PainPoint[];
  readonly sentiment: SentimentBreakdown;
  readonly quotes: CustomerQuote[];
}

export interface LLMBuildRequest {
  readonly ideaText: string;
  readonly signals: Signal[];
  readonly traceId: string;
}

export interface LLMBuildResponse {
  readonly stack: TechComponent[];
  readonly gaps: TechGap[];
}

export interface LLMCompetitorRequest {
  readonly ideaText: string;
  readonly signals: Signal[];
  readonly traceId: string;
}

export interface LLMCompetitorResponse {
  readonly competitors: Competitor[];
  readonly gaps: CompetitorGap[];
}

export interface LLMSearchQueriesRequest {
  readonly ideaText: string;
  readonly traceId: string;
}

export interface LLMSearchQueriesResponse {
  readonly devto: string[];
  readonly google: string[];
}

export interface LLMRelevanceRequest {
  readonly ideaText: string;
  readonly signals: ReadonlyArray<{ readonly id: string; readonly title: string; readonly summary: string }>;
  readonly traceId: string;
}

export interface LLMRelevanceResponse {
  readonly scores: ReadonlyArray<{ readonly id: string; readonly score: number }>;
}

export class LLMClientError extends Error {
  readonly code = 'LLM_CLIENT_ERROR' as const;
}

export interface ILLMClient {
  generateSearchQueries(request: LLMSearchQueriesRequest): Promise<Result<LLMSearchQueriesResponse, LLMClientError>>;
  scoreSignalRelevance(request: LLMRelevanceRequest): Promise<Result<LLMRelevanceResponse, LLMClientError>>;
  generateDecision(request: LLMDecisionRequest): Promise<Result<LLMDecisionResponse, LLMClientError>>;
  generateSimulation(request: LLMSimulationRequest): Promise<Result<LLMSimulationResponse, LLMClientError>>;
  generateLanding(request: LLMLandingRequest): Promise<Result<LLMLandingResponse, LLMClientError>>;
  analyzeCustomers(request: LLMCustomerRequest): Promise<Result<LLMCustomerResponse, LLMClientError>>;
  analyzeBuild(request: LLMBuildRequest): Promise<Result<LLMBuildResponse, LLMClientError>>;
  analyzeCompetitors(request: LLMCompetitorRequest): Promise<Result<LLMCompetitorResponse, LLMClientError>>;
}
