import Groq from 'groq-sdk';
import { Result, ok, err } from 'neverthrow';
import { z } from 'zod';
import type { ILLMClient, LLMDecisionRequest, LLMDecisionResponse } from '@pledgeoff/core';
import { LLMClientError } from '@pledgeoff/core';
import { buildDecisionPrompt, PROMPT_VERSION } from './decision-prompt.v1';

const LLMResponseSchema = z.object({
  verdict: z.enum(['GO', 'KILL', 'PIVOT']),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(1).max(5000),
});

export class GroqLLMAdapter implements ILLMClient {
  private readonly client: Groq;

  constructor(
    apiKey: string,
    private readonly model = 'llama-3.3-70b-versatile',
  ) {
    this.client = new Groq({ apiKey });
  }

  async generateDecision(request: LLMDecisionRequest): Promise<Result<LLMDecisionResponse, LLMClientError>> {
    const prompt = buildDecisionPrompt(request.ideaText, request.signals);

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
        return err(new LLMClientError('Empty response from LLM'));
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        return err(new LLMClientError(`Invalid JSON from LLM: ${content.slice(0, 200)}`));
      }

      const validated = LLMResponseSchema.safeParse(parsed);
      if (!validated.success) {
        return err(new LLMClientError(`LLM response schema invalid: ${validated.error.message}`));
      }

      return ok(validated.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      return err(new LLMClientError(`Groq API error: ${message}`));
    }
  }
}
