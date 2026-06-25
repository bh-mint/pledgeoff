import Groq from 'groq-sdk';
import { Result, ok, err } from 'neverthrow';
import { z } from 'zod';
import type { ILLMClient, LLMDecisionRequest, LLMDecisionResponse, LLMSimulationRequest, LLMSimulationResponse, LLMLandingRequest, LLMLandingResponse, LLMCustomerRequest, LLMCustomerResponse, LLMBuildRequest, LLMBuildResponse, LLMSearchQueriesRequest, LLMSearchQueriesResponse, LLMCompetitorRequest, LLMCompetitorResponse, LLMRelevanceRequest, LLMRelevanceResponse, LLMLaunchKitRequest, LLMLaunchKitResponse, LLMPriorityExplanationRequest, LLMPriorityExplanationResponse, LLMFeatureAnalysisRequest, LLMFeatureAnalysisResponse, LLMBattlecardRequest, LLMBattlecardResponse, IUsageLogger } from '@pledgeoff/core';
import { LLMClientError } from '@pledgeoff/core';
import { createLogger, getTracer, SpanStatusCode } from '@pledgeoff/observability';
import { buildDecisionPrompt, PROMPT_VERSION } from './decision-prompt.v1';
import { buildSimulationPrompt, SIMULATION_PROMPT_VERSION } from './simulation-prompt.v1';
import { buildLandingPrompt, LANDING_PROMPT_VERSION } from './landing-prompt.v1';
import { buildCustomerPrompt, buildLimitedCustomerPrompt, CUSTOMER_PROMPT_VERSION, CUSTOMER_LIMITED_PROMPT_VERSION } from './customer-prompt.v1';
import { buildBuildPrompt, BUILD_PROMPT_VERSION, ANALYZE_BUILD_MAX_TOKENS } from './build-prompt.v1';
import { buildSearchQueriesPrompt, SEARCH_QUERIES_PROMPT_VERSION } from './search-queries-prompt.v1';
import { buildCompetitorPrompt, COMPETITOR_PROMPT_VERSION } from './competitor-prompt.v1';
import { buildRelevancePrompt, RELEVANCE_PROMPT_VERSION } from './relevance-prompt.v1';
import { buildLaunchKitPrompt, LAUNCH_KIT_PROMPT_VERSION } from './launch-kit-prompt.v1';
import { buildFeatureAnalysisPrompt } from './feature-analysis-prompt.v1';
import { buildBattlecardPrompt } from './battlecard-prompt.v1';

const log = createLogger({ adapter: 'groq' });
const tracer = getTracer('groq-llm-adapter');

const DimensionResponseSchema = z.object({
  name: z.string(),
  weight: z.number().min(0).max(1),
  score: z.number().min(0).max(100),
});

const LLMResponseSchema = z.object({
  verdict: z.enum(['GO', 'KILL', 'PIVOT']),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(1).max(5000),
  dimensions: z.array(DimensionResponseSchema).optional(),
});

const SimulationScenarioSchema = z.object({
  name: z.enum(['conservative', 'moderate', 'optimistic']),
  pricePerUser: z.number().positive(),
  mrr6: z.number().nonnegative(),
  mrr12: z.number().nonnegative(),
  mrr24: z.number().nonnegative(),
});

const LLMSimulationResponseSchema = z.object({
  tamLow: z.number().nonnegative(),
  tamHigh: z.number().nonnegative(),
  scenarios: z.array(SimulationScenarioSchema).length(3),
  breakEvenMonths: z.number().nonnegative(),
  assumptions: z.array(z.string()),
});

const LLMLandingResponseSchema = z.object({
  headline: z.string().min(1).max(100),
  subheadline: z.string().min(1).max(200),
  features: z.array(z.string()).min(1).max(5),
  ctaText: z.string().min(1).max(60),
  waitlistHeadline: z.string().min(1).max(120),
});

const CustomerSegmentSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().min(1).max(300),
  size: z.enum(['small', 'medium', 'large']),
});

const LLMCustomerResponseSchema = z.object({
  segments: z.array(CustomerSegmentSchema).min(1).max(5),
  painPoints: z.array(z.object({ text: z.string().min(1).max(200), rank: z.number().int().min(1) })).min(1).max(10),
  sentiment: z.object({
    positive: z.number().min(0).max(100),
    negative: z.number().min(0).max(100),
    neutral: z.number().min(0).max(100),
  }),
  quotes: z.array(z.object({
    text: z.string().min(1).max(400),
    source: z.enum(['reddit', 'hn', 'github']),
    url: z.string().min(1),
  })).max(10),
});

const LLMCustomerLimitedResponseSchema = z.object({
  segments: z.array(CustomerSegmentSchema).min(1).max(1),
  painPoints: z.array(z.object({ text: z.string().min(1).max(200), rank: z.number().int().min(1) })).min(1).max(3),
});

const TechLibrarySchema = z.object({
  name: z.string().min(1).max(80),
  purpose: z.string().min(1).max(200),
  githubUrl: z.string().url().optional(),
  stars: z.number().int().nonnegative().optional(),
});

const TechComponentSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().min(1).max(300),
  decision: z.enum(['build', 'buy', 'oss']),
  rationale: z.string().min(1).max(300),
  libraries: z.array(TechLibrarySchema).max(5),
});

const TechGapSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(300),
  opportunity: z.string().min(1).max(300),
});

const LLMBuildResponseSchema = z.object({
  stack: z.array(TechComponentSchema).min(1).max(8),
  gaps: z.array(TechGapSchema).max(5),
});

const LLMSearchQueriesResponseSchema = z.object({
  devto: z.array(z.string().min(1)).min(1).max(5),
  google: z.array(z.string().min(1)).min(1).max(5),
});

const LLMRelevanceResponseSchema = z.object({
  scores: z.array(z.object({
    id: z.string().min(1),
    score: z.number().min(0).max(100),
  })),
});

const CompetitorItemSchema = z.object({
  name: z.string().min(1),
  url: z.string().optional(),
  positioning: z.string().min(1),
  signals: z.array(z.string().min(1)),
  source: z.enum(['signal', 'knowledge']).optional(),
});

const CompetitorGapItemSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  opportunity: z.string().min(1),
});

const LLMCompetitorResponseSchema = z.object({
  competitors: z.array(CompetitorItemSchema).max(8),
  gaps: z.array(CompetitorGapItemSchema).max(5),
});

const LLMLaunchKitResponseSchemaG = z.object({
  headlines: z.array(z.object({
    variant: z.enum(['A', 'B', 'C']),
    headline: z.string().min(1).max(120),
    angle: z.string().min(1).max(200),
  })).min(1).max(3),
  emailSequence: z.array(z.object({
    sequence: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    subject: z.string().min(1).max(100),
    body: z.string().min(1).max(3000),
    sendAt: z.string().min(1).max(60),
  })).min(1).max(3),
  pricingRecommendation: z.object({
    tier: z.string().min(1).max(60),
    priceMonthly: z.number().positive(),
    currency: z.string().length(3),
    rationale: z.string().min(1).max(1500),
    anchoring: z.string().min(1).max(800),
  }),
  actionPlan: z.array(z.object({
    phase: z.enum(['0-30', '31-60', '61-90']),
    focus: z.string().min(1).max(120),
    actions: z.array(z.string().min(1).max(200)).min(1).max(6),
    metric: z.string().min(1).max(150),
  })).length(3).optional(),
});

const TIMEOUT_MS = 30_000;

// Groq pricing per 1M tokens (llama-3.3-70b-versatile)
const GROQ_COST_PER_M_INPUT = 0.59;
const GROQ_COST_PER_M_OUTPUT = 0.79;

export class GroqLLMAdapter implements ILLMClient {
  private readonly client: Groq;

  constructor(
    apiKey: string,
    private readonly model = 'llama-3.3-70b-versatile',
    private readonly usageLogger?: IUsageLogger,
  ) {
    this.client = new Groq({ apiKey, timeout: TIMEOUT_MS });
  }

  async generateSearchQueries(request: LLMSearchQueriesRequest): Promise<Result<LLMSearchQueriesResponse, LLMClientError>> {
    return tracer.startActiveSpan('groq.generate-search-queries', async (span) => {
      span.setAttributes({ 'adapter.name': 'groq', 'trace.id': request.traceId, 'llm.model': this.model });
      const result = await this._callGroq(
        buildSearchQueriesPrompt(request.ideaText),
        `You are a market research assistant using prompt version ${SEARCH_QUERIES_PROMPT_VERSION}. Always respond with valid JSON only.`,
        LLMSearchQueriesResponseSchema,
        'generateSearchQueries',
        request.traceId,
      );
      if (result.isErr()) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: result.error.message });
      } else {
        span.setStatus({ code: SpanStatusCode.OK });
      }
      span.end();
      return result;
    });
  }

  async scoreSignalRelevance(request: LLMRelevanceRequest): Promise<Result<LLMRelevanceResponse, LLMClientError>> {
    return tracer.startActiveSpan('groq.score-signal-relevance', async (span) => {
      span.setAttributes({ 'adapter.name': 'groq', 'trace.id': request.traceId, 'llm.model': this.model, 'signal.count': request.signals.length });
      const result = await this._callGroq(
        buildRelevancePrompt(request.ideaText, request.signals),
        `You are a relevance scoring assistant using prompt version ${RELEVANCE_PROMPT_VERSION}. Always respond with valid JSON only.`,
        LLMRelevanceResponseSchema,
        'scoreSignalRelevance',
        request.traceId,
      );
      if (result.isErr()) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: result.error.message });
      } else {
        span.setStatus({ code: SpanStatusCode.OK });
      }
      span.end();
      return result;
    });
  }

  async generateDecision(request: LLMDecisionRequest): Promise<Result<LLMDecisionResponse, LLMClientError>> {
    return tracer.startActiveSpan('groq.generate-decision', async (span) => {
      span.setAttributes({ 'adapter.name': 'groq', 'trace.id': request.traceId, 'llm.model': this.model });
      const result = await this._callGroq(
        buildDecisionPrompt(request.ideaText, request.signals, request.calibrationExamples),
        `You are a startup decision intelligence engine using prompt version ${PROMPT_VERSION}. Always respond with valid JSON only.`,
        LLMResponseSchema,
        'generateDecision',
        request.traceId,
      );
      if (result.isErr()) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: result.error.message });
      } else {
        span.setAttributes({ 'llm.verdict': result.value.verdict, 'llm.confidence': result.value.confidence });
        span.setStatus({ code: SpanStatusCode.OK });
      }
      span.end();
      return result;
    });
  }

  async generateSimulation(request: LLMSimulationRequest): Promise<Result<LLMSimulationResponse, LLMClientError>> {
    return tracer.startActiveSpan('groq.generate-simulation', async (span) => {
      span.setAttributes({ 'adapter.name': 'groq', 'trace.id': request.traceId, 'llm.model': this.model });
      const result = await this._callGroq(
        buildSimulationPrompt(request.ideaText, request.verdict, request.signals),
        `You are a startup revenue simulation engine using prompt version ${SIMULATION_PROMPT_VERSION}. Always respond with valid JSON only.`,
        LLMSimulationResponseSchema,
        'generateSimulation',
        request.traceId,
        2048,
      );
      if (result.isErr()) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: result.error.message });
      } else {
        span.setStatus({ code: SpanStatusCode.OK });
      }
      span.end();
      return result;
    });
  }

  async generateLanding(request: LLMLandingRequest): Promise<Result<LLMLandingResponse, LLMClientError>> {
    return tracer.startActiveSpan('groq.generate-landing', async (span) => {
      span.setAttributes({ 'adapter.name': 'groq', 'trace.id': request.traceId, 'llm.model': this.model });
      const result = await this._callGroq(
        buildLandingPrompt(request.ideaText, request.reasoning, request.signals),
        `You are a conversion copywriter using prompt version ${LANDING_PROMPT_VERSION}. Always respond with valid JSON only.`,
        LLMLandingResponseSchema,
        'generateLanding',
        request.traceId,
      );
      if (result.isErr()) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: result.error.message });
      } else {
        span.setStatus({ code: SpanStatusCode.OK });
      }
      span.end();
      return result;
    });
  }

  async analyzeCustomers(request: LLMCustomerRequest): Promise<Result<LLMCustomerResponse, LLMClientError>> {
    return tracer.startActiveSpan('groq.analyze-customers', async (span) => {
      span.setAttributes({ 'adapter.name': 'groq', 'trace.id': request.traceId, 'llm.model': this.model, 'icp.limited': request.limited ?? false });

      if (request.limited) {
        const limitedResult = await this._callGroq(
          buildLimitedCustomerPrompt(request.ideaText),
          `You are a customer intelligence analyst using prompt version ${CUSTOMER_LIMITED_PROMPT_VERSION}. Always respond with valid JSON only.`,
          LLMCustomerLimitedResponseSchema,
          'analyzeCustomers',
          request.traceId,
          512,
        );
        span.setStatus(limitedResult.isErr() ? { code: SpanStatusCode.ERROR, message: limitedResult.error.message } : { code: SpanStatusCode.OK });
        span.end();
        if (limitedResult.isErr()) return err(limitedResult.error);
        return ok({ ...limitedResult.value, sentiment: { positive: 0, negative: 0, neutral: 0 }, quotes: [] });
      }

      const result = await this._callGroq(
        buildCustomerPrompt(request.ideaText, request.signals),
        `You are a customer intelligence analyst using prompt version ${CUSTOMER_PROMPT_VERSION}. Always respond with valid JSON only.`,
        LLMCustomerResponseSchema,
        'analyzeCustomers',
        request.traceId,
        2048,
      );
      if (result.isErr()) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: result.error.message });
      } else {
        span.setStatus({ code: SpanStatusCode.OK });
      }
      span.end();
      return result;
    });
  }

  async analyzeBuild(request: LLMBuildRequest): Promise<Result<LLMBuildResponse, LLMClientError>> {
    return tracer.startActiveSpan('groq.analyze-build', async (span) => {
      span.setAttributes({ 'adapter.name': 'groq', 'trace.id': request.traceId, 'llm.model': this.model });
      const result = await this._callGroq(
        buildBuildPrompt(request.ideaText, request.signals),
        `You are a senior software architect using prompt version ${BUILD_PROMPT_VERSION}. Always respond with valid JSON only.`,
        LLMBuildResponseSchema,
        'analyzeBuild',
        request.traceId,
        ANALYZE_BUILD_MAX_TOKENS,
      );
      if (result.isErr()) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: result.error.message });
      } else {
        span.setStatus({ code: SpanStatusCode.OK });
      }
      span.end();
      return result;
    });
  }

  async analyzeCompetitors(request: LLMCompetitorRequest): Promise<Result<LLMCompetitorResponse, LLMClientError>> {
    return tracer.startActiveSpan('groq.analyze-competitors', async (span) => {
      span.setAttributes({ 'adapter.name': 'groq', 'trace.id': request.traceId, 'llm.model': this.model });
      const result = await this._callGroq(
        buildCompetitorPrompt(request.ideaText, request.signals),
        `You are a competitive intelligence analyst using prompt version ${COMPETITOR_PROMPT_VERSION}. Always respond with valid JSON only. No markdown, no explanation, no code fences — raw JSON object only.`,
        LLMCompetitorResponseSchema,
        'analyzeCompetitors',
        request.traceId,
        3072,
      );
      if (result.isErr()) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: result.error.message });
      } else {
        span.setStatus({ code: SpanStatusCode.OK });
      }
      span.end();
      return result;
    });
  }

  async generateLaunchKit(request: LLMLaunchKitRequest): Promise<Result<LLMLaunchKitResponse, LLMClientError>> {
    return tracer.startActiveSpan('groq.generate-launch-kit', async (span) => {
      span.setAttributes({ 'adapter.name': 'groq', 'trace.id': request.traceId, 'llm.model': this.model });
      const result = await this._callGroq(
        buildLaunchKitPrompt(request.ideaText, request.signals),
        `You are a B2B SaaS go-to-market strategist using prompt version ${LAUNCH_KIT_PROMPT_VERSION}. Always respond with valid JSON only. No markdown, no explanation, no code fences — raw JSON object only.`,
        LLMLaunchKitResponseSchemaG,
        'generateLaunchKit',
        request.traceId,
        2048,
      );
      if (result.isErr()) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: result.error.message });
      } else {
        span.setStatus({ code: SpanStatusCode.OK });
      }
      span.end();
      return result;
    });
  }

  private async _callGroq<T>(
    prompt: string,
    systemPrompt: string,
    schema: z.ZodType<T>,
    operation: string,
    traceId: string,
    maxTokens = 1024,
  ): Promise<Result<T, LLMClientError>> {
    const start = Date.now();
    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        log.error({ traceId, target: 'groq', operation, latencyMs: Date.now() - start, outcome: 'error', errorCode: 'EMPTY_RESPONSE' }, 'Groq returned empty response');
        return err(new LLMClientError('Empty response from LLM'));
      }

      let parsed: unknown;
      try {
        const clean = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
        parsed = JSON.parse(clean);
      } catch {
        log.error({ traceId, target: 'groq', operation, latencyMs: Date.now() - start, outcome: 'error', errorCode: 'INVALID_JSON' }, 'Groq returned invalid JSON');
        return err(new LLMClientError(`Invalid JSON from LLM: ${content.slice(0, 200)}`));
      }

      const validated = schema.safeParse(parsed);
      if (!validated.success) {
        log.error({ traceId, target: 'groq', operation, latencyMs: Date.now() - start, outcome: 'error', errorCode: 'SCHEMA_INVALID' }, 'Groq response failed schema validation');
        return err(new LLMClientError(`LLM response schema invalid: ${validated.error.message}`));
      }

      const inputTokens = completion.usage?.prompt_tokens ?? 0;
      const outputTokens = completion.usage?.completion_tokens ?? 0;
      log.info({ traceId, target: 'groq', operation, latencyMs: Date.now() - start, outcome: 'success', inputTokens, outputTokens }, 'LLM call succeeded');
      if (this.usageLogger) {
        void this.usageLogger.log({
          model: this.model,
          provider: 'groq',
          feature: operation,
          inputTokens,
          outputTokens,
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
          costUsd: (inputTokens * GROQ_COST_PER_M_INPUT + outputTokens * GROQ_COST_PER_M_OUTPUT) / 1_000_000,
          traceId,
        });
      }
      return ok(validated.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      log.error({ traceId, target: 'groq', operation, latencyMs: Date.now() - start, outcome: 'error', errorCode: 'API_ERROR' }, `Groq API error: ${message}`);
      return err(new LLMClientError(`Groq API error: ${message}`));
    }
  }

  // Otto uses Anthropic Haiku — Groq adapter does not support chat
  async chatWithOtto(): Promise<Result<never, LLMClientError>> {
    return err(new LLMClientError('chatWithOtto is not supported by GroqLLMAdapter — use AnthropicLLMAdapter'));
  }

  async analyzeFeatures(request: LLMFeatureAnalysisRequest): Promise<Result<LLMFeatureAnalysisResponse, LLMClientError>> {
    const FeatureCoverageSchema = z.enum(['yes', 'partial', 'no']);
    const LLMFeatureAnalysisResponseSchema = z.object({
      features: z.array(z.object({
        feature: z.string().min(1).max(100),
        category: z.string().min(1).max(60).optional(),
        competitors: z.record(z.string(), FeatureCoverageSchema),
        idea: FeatureCoverageSchema,
      })).min(1).max(20),
    });
    const prompt = buildFeatureAnalysisPrompt(request.ideaText, request.competitorNames);
    return this._callGroq(
      prompt,
      'You are a competitive analyst. Respond with valid JSON only.',
      LLMFeatureAnalysisResponseSchema,
      'analyzeFeatures',
      request.traceId,
      2048,
    );
  }

  async generateBattlecard(request: LLMBattlecardRequest): Promise<Result<LLMBattlecardResponse, LLMClientError>> {
    const EntrySchema = z.object({
      competitorName: z.string().min(1).max(100),
      objection: z.string().min(1).max(300),
      response: z.string().min(1).max(600),
      ourAdvantages: z.array(z.string().min(1).max(200)).min(1).max(6),
      theirWeaknesses: z.array(z.string().min(1).max(200)).min(1).max(6),
    });
    const LLMBattlecardResponseSchema = z.object({
      entries: z.array(EntrySchema).min(1).max(8),
    });
    const prompt = buildBattlecardPrompt(request.ideaText, request.competitorNames);
    return this._callGroq(
      prompt,
      'You are a competitive intelligence analyst. Respond with valid JSON only.',
      LLMBattlecardResponseSchema,
      'generateBattlecard',
      request.traceId,
      2048,
    );
  }

  async generatePriorityExplanation(request: LLMPriorityExplanationRequest): Promise<Result<LLMPriorityExplanationResponse, LLMClientError>> {
    return tracer.startActiveSpan('groq.generate-priority-explanation', async (span) => {
      span.setAttributes({ 'adapter.name': 'groq', 'trace.id': request.traceId });
      const prompt = `Idea: "${request.ideaText}"\nVerdict: ${request.verdict}\nPriority score changed from ${request.previousScore.toFixed(2)} to ${request.currentScore.toFixed(2)}.\nExplain in one short sentence why this idea's priority changed. Focus on market signals, not the score number.`;
      const schema = z.object({ explanation: z.string().min(1).max(200) });
      const result = await this._callGroq(
        prompt,
        'You are a market analyst. Respond with valid JSON only: {"explanation": "..."}',
        schema,
        'generatePriorityExplanation',
        request.traceId,
        128,
      );
      span.end();
      return result;
    });
  }
}
