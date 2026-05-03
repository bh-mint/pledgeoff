import Groq from 'groq-sdk';
import { Result, ok, err } from 'neverthrow';
import { z } from 'zod';
import type { ILLMClient, LLMDecisionRequest, LLMDecisionResponse } from '@pledgeoff/core';
import { LLMClientError } from '@pledgeoff/core';
import { createLogger } from '@pledgeoff/observability';
import { buildDecisionPrompt, PROMPT_VERSION } from './decision-prompt.v1';

const log = createLogger({ adapter: 'groq' });

const LLMResponseSchema = z.object({
  verdict: z.enum(['GO', 'KILL', 'PIVOT']),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(1).max(5000),
});

const TIMEOUT_MS = 30_000;

export class GroqLLMAdapter implements ILLMClient {
  private readonly client: Groq;

  constructor(
    apiKey: string,
    private readonly model = 'llama-3.3-70b-versatile',
  ) {
    this.client = new Groq({ apiKey, timeout: TIMEOUT_MS });
  }

  async generateDecision(request: LLMDecisionRequest): Promise<Result<LLMDecisionResponse, LLMClientError>> {
    const prompt = buildDecisionPrompt(request.ideaText, request.signals);
    const traceId = request.traceId;
    const start = Date.now();

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are a startup decision intelligence engine using prompt version ${PROMPT_VERSION}. Always respond with valid JSON only.`,
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 512,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        log.error(
          { traceId, target: 'groq', operation: 'generateDecision', latencyMs: Date.now() - start, outcome: 'error', errorCode: 'EMPTY_RESPONSE' },
          'Groq returned empty response',
        );
        return err(new LLMClientError('Empty response from LLM'));
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        log.error(
          { traceId, target: 'groq', operation: 'generateDecision', latencyMs: Date.now() - start, outcome: 'error', errorCode: 'INVALID_JSON' },
          'Groq returned invalid JSON',
        );
        return err(new LLMClientError(`Invalid JSON from LLM: ${content.slice(0, 200)}`));
      }

      const validated = LLMResponseSchema.safeParse(parsed);
      if (!validated.success) {
        log.error(
          { traceId, target: 'groq', operation: 'generateDecision', latencyMs: Date.now() - start, outcome: 'error', errorCode: 'SCHEMA_INVALID' },
          'Groq response failed schema validation',
        );
        return err(new LLMClientError(`LLM response schema invalid: ${validated.error.message}`));
      }

      log.info(
        { traceId, target: 'groq', operation: 'generateDecision', latencyMs: Date.now() - start, outcome: 'success', verdict: validated.data.verdict },
        'Decision generated',
      );
      return ok(validated.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      log.error(
        { traceId, target: 'groq', operation: 'generateDecision', latencyMs: Date.now() - start, outcome: 'error', errorCode: 'API_ERROR' },
        `Groq API error: ${message}`,
      );
      return err(new LLMClientError(`Groq API error: ${message}`));
    }
  }
}
