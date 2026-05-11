import { describe, it, expect, vi, afterEach } from 'vitest';
import { GoogleSearchSourceAdapter } from '../google-search-source-adapter';

const ideaId = crypto.randomUUID();
const traceId = crypto.randomUUID();
const ideaText = 'App to track daily habits and productivity metrics';
const API_KEY = 'test-google-key';
const CX = 'test-cx-id';

const makeGoogleResponse = (overrides: { items?: object[]; error?: object } = {}) => ({
  ok: true,
  json: async () => ({
    items: overrides.items ?? [
      {
        title: 'r/productivity - What habit tracking app do you use?',
        link: 'https://www.reddit.com/r/productivity/comments/abc123',
        snippet: 'I tried many habit trackers and found that...',
      },
    ],
    ...('error' in overrides ? { error: overrides.error } : {}),
  }),
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GoogleSearchSourceAdapter', () => {
  it('returns signals on successful fetch', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeGoogleResponse()));

    const adapter = new GoogleSearchSourceAdapter(API_KEY, CX);
    const result = await adapter.fetch(ideaText, ideaId, traceId);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toHaveLength(1);
      const [first] = result.value;
      expect(first?.source).toBe('google');
      expect(first?.ideaId).toBe(ideaId);
      expect(first?.url).toContain('reddit.com');
    }
  });

  it('returns empty signals when no items returned', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeGoogleResponse({ items: [] })));

    const adapter = new GoogleSearchSourceAdapter(API_KEY, CX);
    const result = await adapter.fetch(ideaText, ideaId, traceId);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toHaveLength(0);
    }
  });

  it('returns error on API error response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ error: { message: 'API key invalid', code: 400 } }),
    }));

    const adapter = new GoogleSearchSourceAdapter(API_KEY, CX, 10_000, 1);
    const result = await adapter.fetch(ideaText, ideaId, traceId);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.source).toBe('google');
      expect(result.error.message).toContain('API key invalid');
    }
  });

  it('returns error after all retries exhausted on HTTP failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }));

    const adapter = new GoogleSearchSourceAdapter(API_KEY, CX, 10_000, 2);
    const result = await adapter.fetch(ideaText, ideaId, traceId);

    expect(result.isErr()).toBe(true);
  });

  it('returns error on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));

    const adapter = new GoogleSearchSourceAdapter(API_KEY, CX, 10_000, 1);
    const result = await adapter.fetch(ideaText, ideaId, traceId);

    expect(result.isErr()).toBe(true);
  });

  it('sets sentiment to neutral for all results', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeGoogleResponse()));

    const adapter = new GoogleSearchSourceAdapter(API_KEY, CX);
    const result = await adapter.fetch(ideaText, ideaId, traceId);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value[0]?.sentiment).toBe('neutral');
    }
  });
});
