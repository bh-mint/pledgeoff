import Anthropic from '@anthropic-ai/sdk';
import { Result, ok, err } from 'neverthrow';
import { z } from 'zod';
import type { ILLMClient, LLMDecisionRequest, LLMDecisionResponse, LLMSimulationRequest, LLMSimulationResponse, LLMLandingRequest, LLMLandingResponse, LLMCustomerRequest, LLMCustomerResponse, LLMBuildRequest, LLMBuildResponse, LLMSearchQueriesRequest, LLMSearchQueriesResponse, LLMCompetitorRequest, LLMCompetitorResponse, LLMRelevanceRequest, LLMRelevanceResponse, LLMOttoRequest, LLMOttoResponse } from '@pledgeoff/core';
import { LLMClientError } from '@pledgeoff/core';
import { createLogger, getTracer, SpanStatusCode } from '@pledgeoff/observability';
import { buildDecisionPrompt, PROMPT_VERSION } from './decision-prompt.v1';
import { buildSimulationPrompt, SIMULATION_PROMPT_VERSION } from './simulation-prompt.v1';
import { buildLandingPrompt, LANDING_PROMPT_VERSION } from './landing-prompt.v1';
import { buildCustomerPrompt, CUSTOMER_PROMPT_VERSION } from './customer-prompt.v1';
import { buildBuildPrompt, BUILD_PROMPT_VERSION } from './build-prompt.v1';
import { buildSearchQueriesPrompt, SEARCH_QUERIES_PROMPT_VERSION } from './search-queries-prompt.v1';
import { buildCompetitorPrompt, COMPETITOR_PROMPT_VERSION } from './competitor-prompt.v1';
import { buildRelevancePrompt, RELEVANCE_PROMPT_VERSION } from './relevance-prompt.v1';
import { buildOttoSystemPrompt } from './otto-prompt.v1';

const log = createLogger({ adapter: 'anthropic' });
const tracer = getTracer('anthropic-llm-adapter');

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

const TechLibrarySchemaA = z.object({
  name: z.string().min(1).max(80),
  purpose: z.string().min(1).max(200),
  githubUrl: z.string().url().optional(),
  stars: z.number().int().nonnegative().optional(),
});

const TechComponentSchemaA = z.object({
  name: z.string().min(1).max(80),
  description: z.string().min(1).max(300),
  decision: z.enum(['build', 'buy', 'oss']),
  rationale: z.string().min(1).max(300),
  libraries: z.array(TechLibrarySchemaA).max(5),
});

const TechGapSchemaA = z.object({
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(300),
  opportunity: z.string().min(1).max(300),
});

const LLMBuildResponseSchemaA = z.object({
  stack: z.array(TechComponentSchemaA).min(1).max(8),
  gaps: z.array(TechGapSchemaA).max(5),
});

const LLMSearchQueriesResponseSchemaA = z.object({
  devto: z.array(z.string().min(1)).min(1).max(5),
  google: z.array(z.string().min(1)).min(1).max(5),
});

const LLMRelevanceResponseSchemaA = z.object({
  scores: z.array(z.object({
    id: z.string().min(1),
    score: z.number().min(0).max(100),
  })),
});

const CompetitorItemSchemaA = z.object({
  name: z.string().min(1),
  url: z.string().optional(),
  positioning: z.string().min(1),
  signals: z.array(z.string().min(1)),
  source: z.enum(['signal', 'knowledge']).optional(),
});

const CompetitorGapItemSchemaA = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  opportunity: z.string().min(1),
});

const LLMCompetitorResponseSchemaA = z.object({
  competitors: z.array(CompetitorItemSchemaA).max(8),
  gaps: z.array(CompetitorGapItemSchemaA).max(5),
});

const TIMEOUT_MS = 60_000;

const DECISION_SYSTEM_PROMPT = `You are a startup decision intelligence engine using prompt version ${PROMPT_VERSION}. Always respond with valid JSON only. No explanation, no markdown, no code fences — raw JSON object only.`;
const SIMULATION_SYSTEM_PROMPT = `You are a startup revenue simulation engine using prompt version ${SIMULATION_PROMPT_VERSION}. Always respond with valid JSON only. No explanation, no markdown, no code fences — raw JSON object only.`;
const LANDING_SYSTEM_PROMPT = `You are a conversion copywriter using prompt version ${LANDING_PROMPT_VERSION}. Always respond with valid JSON only. No explanation, no markdown, no code fences — raw JSON object only.`;
const CUSTOMER_SYSTEM_PROMPT = `You are a customer intelligence analyst using prompt version ${CUSTOMER_PROMPT_VERSION}. Always respond with valid JSON only. No explanation, no markdown, no code fences — raw JSON object only.`;
const BUILD_SYSTEM_PROMPT = `You are a senior software architect using prompt version ${BUILD_PROMPT_VERSION}. Always respond with valid JSON only. No explanation, no markdown, no code fences — raw JSON object only.`;
const SEARCH_QUERIES_SYSTEM_PROMPT = `You are a market research assistant using prompt version ${SEARCH_QUERIES_PROMPT_VERSION}. Always respond with valid JSON only. No explanation, no markdown, no code fences — raw JSON object only.`;
const COMPETITOR_SYSTEM_PROMPT = `You are a competitive intelligence analyst using prompt version ${COMPETITOR_PROMPT_VERSION}. Always respond with valid JSON only. No explanation, no markdown, no code fences — raw JSON object only.`;
const RELEVANCE_SYSTEM_PROMPT = `You are a relevance scoring assistant using prompt version ${RELEVANCE_PROMPT_VERSION}. Always respond with valid JSON only. No explanation, no markdown, no code fences — raw JSON object only.`;

export class AnthropicLLMAdapter implements ILLMClient {
  private readonly client: Anthropic;

  constructor(
    apiKey: string,
    private readonly model = 'claude-sonnet-4-6',
  ) {
    this.client = new Anthropic({ apiKey, timeout: TIMEOUT_MS });
  }

  async generateSearchQueries(request: LLMSearchQueriesRequest): Promise<Result<LLMSearchQueriesResponse, LLMClientError>> {
    return tracer.startActiveSpan('anthropic.generate-search-queries', async (span) => {
      span.setAttributes({ 'adapter.name': 'anthropic', 'trace.id': request.traceId, 'llm.model': this.model });
      const result = await this._callAnthropic(
        buildSearchQueriesPrompt(request.ideaText),
        SEARCH_QUERIES_SYSTEM_PROMPT,
        LLMSearchQueriesResponseSchemaA,
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
    return tracer.startActiveSpan('anthropic.score-signal-relevance', async (span) => {
      span.setAttributes({ 'adapter.name': 'anthropic', 'trace.id': request.traceId, 'llm.model': this.model, 'signal.count': request.signals.length });
      const result = await this._callAnthropic(
        buildRelevancePrompt(request.ideaText, request.signals),
        RELEVANCE_SYSTEM_PROMPT,
        LLMRelevanceResponseSchemaA,
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
    return tracer.startActiveSpan('anthropic.generate-decision', async (span) => {
      span.setAttributes({ 'adapter.name': 'anthropic', 'trace.id': request.traceId, 'llm.model': this.model });
      const result = await this._callAnthropic(
        buildDecisionPrompt(request.ideaText, request.signals),
        DECISION_SYSTEM_PROMPT,
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
    return tracer.startActiveSpan('anthropic.generate-simulation', async (span) => {
      span.setAttributes({ 'adapter.name': 'anthropic', 'trace.id': request.traceId, 'llm.model': this.model });
      const result = await this._callAnthropic(
        buildSimulationPrompt(request.ideaText, request.verdict, request.signals),
        SIMULATION_SYSTEM_PROMPT,
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
    return tracer.startActiveSpan('anthropic.generate-landing', async (span) => {
      span.setAttributes({ 'adapter.name': 'anthropic', 'trace.id': request.traceId, 'llm.model': this.model });
      const result = await this._callAnthropic(
        buildLandingPrompt(request.ideaText, request.reasoning),
        LANDING_SYSTEM_PROMPT,
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
    return tracer.startActiveSpan('anthropic.analyze-customers', async (span) => {
      span.setAttributes({ 'adapter.name': 'anthropic', 'trace.id': request.traceId, 'llm.model': this.model });
      const result = await this._callAnthropic(
        buildCustomerPrompt(request.ideaText, request.signals),
        CUSTOMER_SYSTEM_PROMPT,
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
    return tracer.startActiveSpan('anthropic.analyze-build', async (span) => {
      span.setAttributes({ 'adapter.name': 'anthropic', 'trace.id': request.traceId, 'llm.model': this.model });
      const result = await this._callAnthropic(
        buildBuildPrompt(request.ideaText, request.signals),
        BUILD_SYSTEM_PROMPT,
        LLMBuildResponseSchemaA,
        'analyzeBuild',
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

  async chatWithOtto(request: LLMOttoRequest): Promise<Result<LLMOttoResponse, LLMClientError>> {
    return tracer.startActiveSpan('anthropic.chat-with-otto', async (span) => {
      span.setAttributes({ 'adapter.name': 'anthropic', 'trace.id': request.traceId, 'llm.model': 'claude-haiku-4-5-20251001', 'otto.history_length': request.history.length });
      const start = Date.now();
      try {
        const systemPrompt = buildOttoSystemPrompt(request.ideaText, request.verdict, request.reasoning, request.score);
        const messages: Anthropic.MessageParam[] = [
          ...request.history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
          { role: 'user', content: request.userMessage },
        ];

        const message = await this.client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          temperature: 0.7,
          system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
          messages,
        });

        const content = message.content[0];
        if (!content || content.type !== 'text') {
          span.setStatus({ code: SpanStatusCode.ERROR, message: 'empty response' });
          span.end();
          return err(new LLMClientError('Empty response from Otto LLM'));
        }

        const cacheStats = message.usage as { cache_creation_input_tokens?: number; cache_read_input_tokens?: number };
        log.info({ traceId: request.traceId, target: 'anthropic', operation: 'chatWithOtto', latencyMs: Date.now() - start, outcome: 'success', inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens, cacheRead: cacheStats.cache_read_input_tokens ?? 0 }, 'Otto chat succeeded');
        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
        return ok({ reply: content.text.trim() });
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'unknown error';
        log.error({ traceId: request.traceId, target: 'anthropic', operation: 'chatWithOtto', latencyMs: Date.now() - start, outcome: 'error', errorCode: 'API_ERROR' }, `Otto API error: ${msg}`);
        span.setStatus({ code: SpanStatusCode.ERROR, message: msg });
        span.end();
        return err(new LLMClientError(`Anthropic API error: ${msg}`));
      }
    });
  }

  async analyzeCompetitors(request: LLMCompetitorRequest): Promise<Result<LLMCompetitorResponse, LLMClientError>> {
    return tracer.startActiveSpan('anthropic.analyze-competitors', async (span) => {
      span.setAttributes({ 'adapter.name': 'anthropic', 'trace.id': request.traceId, 'llm.model': this.model });
      const result = await this._callAnthropic(
        buildCompetitorPrompt(request.ideaText, request.signals),
        COMPETITOR_SYSTEM_PROMPT,
        LLMCompetitorResponseSchemaA,
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

  private async _callAnthropic<T>(
    prompt: string,
    systemPrompt: string,
    schema: z.ZodType<T>,
    operation: string,
    traceId: string,
    maxTokens = 1024,
  ): Promise<Result<T, LLMClientError>> {
    const start = Date.now();
    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: maxTokens,
        temperature: 0.3,
        system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: prompt }],
      });

      const content = message.content[0];
      if (!content || content.type !== 'text') {
        log.error({ traceId, target: 'anthropic', operation, latencyMs: Date.now() - start, outcome: 'error', errorCode: 'EMPTY_RESPONSE' }, 'Anthropic returned empty response');
        return err(new LLMClientError('Empty response from LLM'));
      }

      let parsed: unknown;
      try {
        const clean = content.text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
        parsed = JSON.parse(clean);
      } catch {
        log.error({ traceId, target: 'anthropic', operation, latencyMs: Date.now() - start, outcome: 'error', errorCode: 'INVALID_JSON' }, 'Anthropic returned invalid JSON');
        return err(new LLMClientError(`Invalid JSON from LLM: ${content.text.slice(0, 200)}`));
      }

      const validated = schema.safeParse(parsed);
      if (!validated.success) {
        log.error({ traceId, target: 'anthropic', operation, latencyMs: Date.now() - start, outcome: 'error', errorCode: 'SCHEMA_INVALID' }, 'Anthropic response failed schema validation');
        return err(new LLMClientError(`LLM response schema invalid: ${validated.error.message}`));
      }

      const cacheStats = message.usage as { cache_creation_input_tokens?: number; cache_read_input_tokens?: number };
      log.info({ traceId, target: 'anthropic', operation, latencyMs: Date.now() - start, outcome: 'success', inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens, cacheCreated: cacheStats.cache_creation_input_tokens ?? 0, cacheRead: cacheStats.cache_read_input_tokens ?? 0 }, 'Anthropic call succeeded');

      return ok(validated.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      log.error({ traceId, target: 'anthropic', operation, latencyMs: Date.now() - start, outcome: 'error', errorCode: 'API_ERROR' }, `Anthropic API error: ${message}`);
      return err(new LLMClientError(`Anthropic API error: ${message}`));
    }
  }
}
