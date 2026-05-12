import { describe, it, expect, vi, afterEach } from 'vitest';
import { DevToSourceAdapter } from '../devto-source-adapter';

const ideaId = crypto.randomUUID();
const traceId = crypto.randomUUID();
const query = 'async meeting summarizer';

const makeDevToResponse = (articles: { positive_reactions_count: number; description?: string | null }[] = []) => ({
  ok: true,
  json: async () =>
    articles.map((a, i) => ({
      id: i + 1,
      title: `Article ${i + 1}`,
      description: Object.prototype.hasOwnProperty.call(a, 'description') ? a.description : `Description for article ${i + 1}`,
      url: `https://dev.to/user/article-${i + 1}`,
      positive_reactions_count: a.positive_reactions_count,
    })),
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DevToSourceAdapter', () => {
  it('returns top 2 signals sorted by reactions', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(
      makeDevToResponse([
        { positive_reactions_count: 10 },
        { positive_reactions_count: 80 },
        { positive_reactions_count: 5 },
        { positive_reactions_count: 30 },
        { positive_reactions_count: 120 },
      ]),
    ));

    const adapter = new DevToSourceAdapter();
    const result = await adapter.fetch(query, ideaId, traceId);

    expect(result.isOk()).toBe(true);
    const signals = result._unsafeUnwrap();
    expect(signals).toHaveLength(2);
    expect(signals[0]!.sentiment).toBe('positive'); // 120 reactions
    expect(signals[1]!.sentiment).toBe('positive'); // 80 reactions
    expect(signals.every((s) => s.source === 'devto')).toBe(true);
    expect(signals.every((s) => s.ideaId === ideaId)).toBe(true);
  });

  it('scores sentiment correctly', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(
      makeDevToResponse([
        { positive_reactions_count: 3 },   // negative
        { positive_reactions_count: 20 },  // neutral
      ]),
    ));

    const adapter = new DevToSourceAdapter();
    const result = await adapter.fetch(query, ideaId, traceId);

    expect(result.isOk()).toBe(true);
    const signals = result._unsafeUnwrap();
    expect(signals[0]!.sentiment).toBe('neutral');  // 20 > 3, sorted desc
    expect(signals[1]!.sentiment).toBe('negative'); // 3
  });

  it('uses description if available, falls back to title', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(
      makeDevToResponse([
        { positive_reactions_count: 50, description: 'Rich description here' },
        { positive_reactions_count: 10, description: null },
      ]),
    ));

    const adapter = new DevToSourceAdapter();
    const result = await adapter.fetch(query, ideaId, traceId);

    expect(result.isOk()).toBe(true);
    const signals = result._unsafeUnwrap();
    expect(signals[0]!.summary).toBe('Rich description here');
    expect(signals[1]!.summary).toBe('Article 2'); // fallback to title
  });

  it('returns empty array when API returns empty list', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(makeDevToResponse([])));

    const adapter = new DevToSourceAdapter();
    const result = await adapter.fetch(query, ideaId, traceId);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toHaveLength(0);
  });

  it('returns error on HTTP failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }));

    const adapter = new DevToSourceAdapter(5_000, 1);
    const result = await adapter.fetch(query, ideaId, traceId);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().source).toBe('devto');
  });

  it('returns error when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));

    const adapter = new DevToSourceAdapter(5_000, 1);
    const result = await adapter.fetch(query, ideaId, traceId);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe('network error');
  });
});
