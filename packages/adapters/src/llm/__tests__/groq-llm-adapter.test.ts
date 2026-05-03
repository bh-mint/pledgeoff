import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GroqLLMAdapter } from '../groq-llm-adapter';
import type { Signal } from '@pledgeoff/core';

const makeSignal = (sentiment: Signal['sentiment'] = 'positive'): Signal => ({
  id: crypto.randomUUID(),
  ideaId: crypto.randomUUID(),
  source: 'reddit',
  url: 'https://reddit.com/r/startups/comments/abc',
  title: 'App tracking habits',
  summary: 'Great demand for this product.',
  sentiment,
  fetchedAt: new Date().toISOString(),
});

const baseRequest = {
  ideaText: 'A habit tracking app for remote workers',
  signals: [makeSignal('positive'), makeSignal('positive')],
  traceId: crypto.randomUUID(),
};

function makeGroqClient(content: string, overrides: { ok?: boolean } = {}) {
  return {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: overrides.ok === false ? [] : [{ message: { content } }],
        }),
      },
    },
  };
}

describe('GroqLLMAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a valid decision for a positive idea', async () => {
    const mockResponse = JSON.stringify({
      verdict: 'GO',
      confidence: 0.85,
      reasoning: 'Strong positive signals from Reddit indicate clear market demand.',
    });

    const adapter = new GroqLLMAdapter('test-key');
    // @ts-expect-error - replace private client for testing
    adapter.client = makeGroqClient(mockResponse);

    const result = await adapter.generateDecision(baseRequest);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.verdict).toBe('GO');
      expect(result.value.confidence).toBe(0.85);
      expect(result.value.reasoning).toContain('market demand');
    }
  });

  it('returns KILL verdict when signals are negative', async () => {
    const mockResponse = JSON.stringify({
      verdict: 'KILL',
      confidence: 0.78,
      reasoning: 'Majority of signals are negative with low engagement.',
    });

    const adapter = new GroqLLMAdapter('test-key');
    // @ts-expect-error - replace private client for testing
    adapter.client = makeGroqClient(mockResponse);

    const result = await adapter.generateDecision({
      ...baseRequest,
      signals: [makeSignal('negative'), makeSignal('negative')],
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.verdict).toBe('KILL');
    }
  });

  it('returns error when LLM returns empty response', async () => {
    const adapter = new GroqLLMAdapter('test-key');
    // @ts-expect-error - replace private client for testing
    adapter.client = makeGroqClient('', { ok: false });

    const result = await adapter.generateDecision(baseRequest);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toContain('Empty response');
    }
  });

  it('returns error when LLM returns invalid JSON', async () => {
    const adapter = new GroqLLMAdapter('test-key');
    // @ts-expect-error - replace private client for testing
    adapter.client = makeGroqClient('not valid json at all');

    const result = await adapter.generateDecision(baseRequest);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toContain('Invalid JSON');
    }
  });

  it('returns error when LLM response fails schema validation', async () => {
    const invalidResponse = JSON.stringify({
      verdict: 'MAYBE', // not a valid verdict
      confidence: 0.5,
      reasoning: 'Some reasoning',
    });

    const adapter = new GroqLLMAdapter('test-key');
    // @ts-expect-error - replace private client for testing
    adapter.client = makeGroqClient(invalidResponse);

    const result = await adapter.generateDecision(baseRequest);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toContain('schema invalid');
    }
  });

  it('returns error when Groq API throws', async () => {
    const adapter = new GroqLLMAdapter('test-key');
    // @ts-expect-error - replace private client for testing
    adapter.client = {
      chat: {
        completions: {
          create: vi.fn().mockRejectedValue(new Error('rate limit exceeded')),
        },
      },
    };

    const result = await adapter.generateDecision(baseRequest);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toContain('rate limit exceeded');
    }
  });
});
