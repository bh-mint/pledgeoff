import { describe, it, expect, vi, afterEach } from 'vitest';
import { RedditSourceAdapter } from '../reddit-source-adapter';

const ideaId = crypto.randomUUID();
const traceId = crypto.randomUUID();
const ideaText = 'App to track daily habits and productivity metrics';

const makeRedditResponse = (overrides: Partial<{ score: number; selftext: string }> = {}) => ({
  data: {
    children: [
      {
        data: {
          id: 'abc123',
          url: 'https://reddit.com/r/startups/comments/abc',
          title: 'Habit tracking startup idea',
          selftext: overrides.selftext ?? 'People really want this',
          score: overrides.score ?? 15,
          permalink: '/r/startups/comments/abc/habit_tracking',
        },
      },
    ],
  },
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('RedditSourceAdapter', () => {
  it('returns signals on successful fetch', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => makeRedditResponse(),
    }));

    const adapter = new RedditSourceAdapter();
    const result = await adapter.fetch(ideaText, ideaId, traceId);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const [first] = result.value;
      expect(result.value).toHaveLength(1);
      expect(first?.source).toBe('reddit');
      expect(first?.ideaId).toBe(ideaId);
      expect(first?.sentiment).toBe('positive'); // score > 10
    }
  });

  it('scores negative sentiment for downvoted posts', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => makeRedditResponse({ score: -5 }),
    }));

    const adapter = new RedditSourceAdapter();
    const result = await adapter.fetch(ideaText, ideaId, traceId);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const [first] = result.value;
      expect(first?.sentiment).toBe('negative');
    }
  });

  it('returns error after all retries exhausted on HTTP failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));

    const adapter = new RedditSourceAdapter(10_000, 2);
    const result = await adapter.fetch(ideaText, ideaId, traceId);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.source).toBe('reddit');
    }
  });

  it('returns error on network failure (timeout)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('AbortError')));

    const adapter = new RedditSourceAdapter(10_000, 1);
    const result = await adapter.fetch(ideaText, ideaId, traceId);

    expect(result.isErr()).toBe(true);
  });

  it('uses selftext fallback to title when empty', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => makeRedditResponse({ selftext: '' }),
    }));

    const adapter = new RedditSourceAdapter();
    const result = await adapter.fetch(ideaText, ideaId, traceId);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const [first] = result.value;
      expect(first?.summary).toBe('Habit tracking startup idea');
    }
  });
});
