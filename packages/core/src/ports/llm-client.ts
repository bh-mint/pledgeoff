import { Result } from 'neverthrow';
import type { Signal } from '../domain/signal';
import type { Verdict, Dimension } from '../domain/decision';
import type { SimulationScenario } from '../domain/simulation';
import type { CustomerSegment, PainPoint, SentimentBreakdown, CustomerQuote } from '../domain/customer-analysis';
import type { TechComponent, TechGap } from '../domain/build-analysis';
import type { Competitor, CompetitorGap } from '../domain/competitor-analysis';

export interface CalibrationExample {
  readonly ideaText: string;
  readonly verdict: 'GO' | 'KILL';
  readonly outcome: 'built_worked' | 'not_built';
  readonly reasoning: string;
}

export interface LLMDecisionRequest {
  readonly ideaText: string;
  readonly signals: Signal[];
  readonly traceId: string;
  readonly calibrationExamples?: CalibrationExample[];
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
  readonly signals?: Signal[];
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
  readonly limited?: boolean;
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

export interface LLMLaunchKitRequest {
  readonly ideaText: string;
  readonly reasoning: string;
  readonly signals: Signal[];
  readonly traceId: string;
}

export interface LLMLaunchKitHeadline {
  readonly variant: 'A' | 'B' | 'C';
  readonly headline: string;
  readonly angle: string;
}

export interface LLMLaunchKitEmail {
  readonly sequence: 1 | 2 | 3;
  readonly subject: string;
  readonly body: string;
  readonly sendAt: string;
}

export interface LLMLaunchKitPricing {
  readonly tier: string;
  readonly priceMonthly: number;
  readonly currency: string;
  readonly rationale: string;
  readonly anchoring: string;
}

export interface LLMLaunchKitResponse {
  readonly headlines: LLMLaunchKitHeadline[];
  readonly emailSequence: LLMLaunchKitEmail[];
  readonly pricingRecommendation: LLMLaunchKitPricing;
}

export interface LLMOttoMessage {
  readonly role: 'user' | 'assistant';
  readonly content: string;
}

export interface LLMOttoRequest {
  readonly ideaText: string;
  readonly verdict: string;
  readonly reasoning: string;
  readonly score: number;
  readonly history: LLMOttoMessage[];
  readonly userMessage: string;
  readonly traceId: string;
  readonly userId?: string;
}

export interface LLMOttoResponse {
  readonly reply: string;
}

export interface LLMPriorityExplanationRequest {
  readonly ideaText: string;
  readonly verdict: string;
  readonly previousScore: number;
  readonly currentScore: number;
  readonly traceId: string;
}

export interface LLMPriorityExplanationResponse {
  readonly explanation: string; // e.g. "Competitor X failed → opportunity increased"
}

export class LLMClientError extends Error {
  readonly code = 'LLM_CLIENT_ERROR' as const;
}

export interface LLMFeatureAnalysisRequest {
  readonly ideaText: string;
  readonly competitorNames: string[];
  readonly traceId: string;
}

export interface LLMFeatureRow {
  readonly feature: string;
  readonly category?: string;
  readonly competitors: Record<string, 'yes' | 'partial' | 'no'>;
  readonly idea: 'yes' | 'partial' | 'no';
}

export interface LLMFeatureAnalysisResponse {
  readonly features: LLMFeatureRow[];
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
  chatWithOtto(request: LLMOttoRequest): Promise<Result<LLMOttoResponse, LLMClientError>>;
  generateLaunchKit(request: LLMLaunchKitRequest): Promise<Result<LLMLaunchKitResponse, LLMClientError>>;
  generatePriorityExplanation(request: LLMPriorityExplanationRequest): Promise<Result<LLMPriorityExplanationResponse, LLMClientError>>;
  analyzeFeatures(request: LLMFeatureAnalysisRequest): Promise<Result<LLMFeatureAnalysisResponse, LLMClientError>>;
}
