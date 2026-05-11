import Anthropic from '@anthropic-ai/sdk';
import { Result, ok, err } from 'neverthrow';
import { z } from 'zod';
import type { ILLMClient, LLMDecisionRequest, LLMDecisionResponse, LLMSimulationRequest, LLMSimulationResponse } from '@pledgeoff/core';
import { LLMClientError } from '@pledgeoff/core';
import { createLogger, getTracer, SpanStatusCode } from '@pledgeoff/observability';
import { buildDecisionPrompt, PROMPT_VERSION } from './decision-prompt.v1';
import { buildSimulationPrompt, SIMULATION_PROMPT_VERSION } from './simulation-prompt.v1';

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

const TIMEOUT_MS = 30_000;

const DECISION_SYSTEM_PROMPT = `You are a startup decision intelligence engine using prompt version ${PROMPT_VERSION}. Always respond with valid JSON only. No explanation, no markdown, no code fences — raw JSON object only.`;
const SIMULATION_SYSTEM_PROMPT = `You are a startup revenue simulation engine using prompt version ${SIMULATION_PROMPT_VERSION}. Always respond with valid JSON only. No explanation, no markdown, no code fences — raw JSON object only.`;

export class AnthropicLLMAdapter implements ILLMClient {
  private readonly client: Anthropic;

  constructor(
    apiKey: string,
    private readonly model = 'claude-haiku-4-5-20251001',
  ) {
    this.client = new Anthropic({ apiKey, timeout: TIMEOUT_MS });
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
  ): Promise<Result<T, LLMClientError>> {
    const start = Date.now();
    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 1024,
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
        parsed = JSON.parse(content.text);
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
