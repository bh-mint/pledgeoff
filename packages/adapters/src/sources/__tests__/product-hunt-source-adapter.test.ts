import { describe, it, expect, vi, afterEach } from 'vitest';
import { ProductHuntSourceAdapter } from '../product-hunt-source-adapter';

const ideaId = crypto.randomUUID();
const traceId = crypto.randomUUID();
const ideaText = 'App to track daily habits and productivity metrics';
const API_KEY = 'test-key';
const API_SECRET = 'test-secret';

const makeTokenResponse = () => ({
  ok: true,
  json: async () => ({ access_token: 'test-token', token_type: 'Bearer' }),
});

const makePHResponse = (overrides: Partial<{ votesCount: number; description: string | null }> = {}) => ({
  ok: true,
  json: async () => ({
    data: {
      posts: {
        edges: [
          {
            node: {
              id: 'ph123',
              name: 'HabitTrack Pro',
              tagline: 'Build habits that stick',
              description: overrides.description !== undefined ? overrides.description : 'A powerful habit tracker',
              url: 'https://www.producthunt.com/posts/habittrack-pro',
              votesCount: overrides.votesCount ?? 150,
            },
          },
        ],
      },
    },
  }),
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ProductHuntSourceAdapter', () => {
  it('returns signals on successful fetch', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(makeTokenResponse())
      .mockResolvedValueOnce(makePHResponse()),
    );

    const adapter = new ProductHuntSourceAdapter(API_KEY, API_SECRET);
    const result = await adapter.fetch(ideaText, ideaId, traceId);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toHaveLength(1);
      const [first] = result.value;
      expect(first?.source).toBe('producthunt');
      expect(first?.ideaId).toBe(ideaId);
      expect(first?.sentiment).toBe('positive'); // votes >= 100
    }
  });

  it('scores negative sentiment for products with few votes', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(makeTokenResponse())
      .mockResolvedValueOnce(makePHResponse({ votesCount: 5 })),
    );

    const adapter = new ProductHuntSourceAdapter(API_KEY, API_SECRET);
    const result = await adapter.fetch(ideaText, ideaId, traceId);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value[0]?.sentiment).toBe('negative');
    }
  });

  it('uses tagline as summary when description is null', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(makeTokenResponse())
      .mockResolvedValueOnce(makePHResponse({ description: null })),
    );

    const adapter = new ProductHuntSourceAdapter(API_KEY, API_SECRET);
    const result = await adapter.fetch(ideaText, ideaId, traceId);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value[0]?.summary).toBe('Build habits that stick');
    }
  });

  it('returns error when token fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));

    const adapter = new ProductHuntSourceAdapter(API_KEY, API_SECRET, 10_000, 1);
    const result = await adapter.fetch(ideaText, ideaId, traceId);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.source).toBe('producthunt');
    }
  });

  it('returns error when GraphQL returns errors', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(makeTokenResponse())
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ errors: [{ message: 'Unauthorized' }] }),
      }),
    );

    const adapter = new ProductHuntSourceAdapter(API_KEY, API_SECRET, 10_000, 1);
    const result = await adapter.fetch(ideaText, ideaId, traceId);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toContain('Unauthorized');
    }
  });

  it('returns error after all retries exhausted on HTTP failure', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(makeTokenResponse())
      .mockResolvedValue({ ok: false, status: 503 }),
    );

    const adapter = new ProductHuntSourceAdapter(API_KEY, API_SECRET, 10_000, 2);
    const result = await adapter.fetch(ideaText, ideaId, traceId);

    expect(result.isErr()).toBe(true);
  });
});
