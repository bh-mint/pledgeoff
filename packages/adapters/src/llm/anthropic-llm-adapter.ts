import Anthropic from '@anthropic-ai/sdk';
import { Result, ok, err } from 'neverthrow';
import { z } from 'zod';
import type { ILLMClient, LLMDecisionRequest, LLMDecisionResponse } from '@pledgeoff/core';
import { LLMClientError } from '@pledgeoff/core';
import { createLogger } from '@pledgeoff/observability';
import { buildDecisionPrompt, PROMPT_VERSION } from './decision-prompt.v1';

const log = createLogger({ adapter: 'anthropic' });

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

const TIMEOUT_MS = 30_000;

// Cached system prompt — static across all requests, eligible for Anthropic prompt caching
const SYSTEM_PROMPT = `You are a startup decision intelligence engine using prompt version ${PROMPT_VERSION}. Always respond with valid JSON only. No explanation, no markdown, no code fences — raw JSON object only.`;

export class AnthropicLLMAdapter implements ILLMClient {
  private readonly client: Anthropic;

  constructor(
    apiKey: string,
    private readonly model = 'claude-haiku-4-5-20251001',
  ) {
    this.client = new Anthropic({ apiKey, timeout: TIMEOUT_MS });
  }

  async generateDecision(request: LLMDecisionRequest): Promise<Result<LLMDecisionResponse, LLMClientError>> {
    const prompt = buildDecisionPrompt(request.ideaText, request.signals);
    const traceId = request.traceId;
    const start = Date.now();

    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 1024,
        temperature: 0.3,
        system: [
          {
            type: 'text',
            text: SYSTEM_PROMPT,
            // Prompt caching: system prompt is static — cached after first request (~85% cost reduction)
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [{ role: 'user', content: prompt }],
      });

      const content = message.content[0];
      if (!content || content.type !== 'text') {
        log.error(
          { traceId, target: 'anthropic', operation: 'generateDecision', latencyMs: Date.now() - start, outcome: 'error', errorCode: 'EMPTY_RESPONSE' },
          'Anthropic returned empty response',
        );
        return err(new LLMClientError('Empty response from LLM'));
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(content.text);
      } catch {
        log.error(
          { traceId, target: 'anthropic', operation: 'generateDecision', latencyMs: Date.now() - start, outcome: 'error', errorCode: 'INVALID_JSON' },
          'Anthropic returned invalid JSON',
        );
        return err(new LLMClientError(`Invalid JSON from LLM: ${content.text.slice(0, 200)}`));
      }

      const validated = LLMResponseSchema.safeParse(parsed);
      if (!validated.success) {
        log.error(
          { traceId, target: 'anthropic', operation: 'generateDecision', latencyMs: Date.now() - start, outcome: 'error', errorCode: 'SCHEMA_INVALID' },
          'Anthropic response failed schema validation',
        );
        return err(new LLMClientError(`LLM response schema invalid: ${validated.error.message}`));
      }

      const cacheStats = message.usage as { cache_creation_input_tokens?: number; cache_read_input_tokens?: number };
      log.info(
        {
          traceId,
          target: 'anthropic',
          operation: 'generateDecision',
          latencyMs: Date.now() - start,
          outcome: 'success',
          verdict: validated.data.verdict,
          inputTokens: message.usage.input_tokens,
          outputTokens: message.usage.output_tokens,
          cacheCreated: cacheStats.cache_creation_input_tokens ?? 0,
          cacheRead: cacheStats.cache_read_input_tokens ?? 0,
        },
        'Decision generated',
      );

      return ok(validated.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      log.error(
        { traceId, target: 'anthropic', operation: 'generateDecision', latencyMs: Date.now() - start, outcome: 'error', errorCode: 'API_ERROR' },
        `Anthropic API error: ${message}`,
      );
      return err(new LLMClientError(`Anthropic API error: ${message}`));
    }
  }
}
