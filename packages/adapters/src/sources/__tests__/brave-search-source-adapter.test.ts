import { describe, it, expect, vi, afterEach } from 'vitest';
import { BraveSearchSourceAdapter } from '../brave-search-source-adapter';

const ideaId = crypto.randomUUID();
const traceId = crypto.randomUUID();
const query = 'AI meeting summarizer tool';
const API_KEY = 'test-brave-api-key';

const makeBraveResponse = (results: { title: string; url: string; description: string }[] = []) => ({
  ok: true,
  json: async () => ({ web: { results } }),
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('BraveSearchSourceAdapter', () => {
  it('returns signals on successful fetch', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(
      makeBraveResponse([
        { title: 'Reddit: Best AI meeting tools', url: 'https://reddit.com/r/productivity/comments/abc', description: 'Discussion about AI summarizers' },
        { title: 'Reddit: AI tools for async teams', url: 'https://reddit.com/r/remotework/comments/xyz', description: 'People sharing experiences with AI tools' },
      ]),
    ));

    const adapter = new BraveSearchSourceAdapter(API_KEY);
    const result = await adapter.fetch(query, ideaId, traceId);

    expect(result.isOk()).toBe(true);
    const signals = result._unsafeUnwrap();
    expect(signals).toHaveLength(2);
    expect(signals.every((s) => s.source === 'brave')).toBe(true);
    expect(signals.every((s) => s.ideaId === ideaId)).toBe(true);
    expect(signals.every((s) => s.sentiment === 'neutral')).toBe(true);
  });

  it('adds site:reddit.com restriction to query', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(makeBraveResponse([]));
    vi.stubGlobal('fetch', fetchMock);

    const adapter = new BraveSearchSourceAdapter(API_KEY);
    await adapter.fetch(query, ideaId, traceId);

    const calledUrl = (fetchMock.mock.calls[0] as [string, RequestInit])[0];
    expect(calledUrl).toContain('site%3Areddit.com');
    // URLSearchParams encodes spaces as +, so check individual keywords
    expect(calledUrl).toContain('meeting');
    expect(calledUrl).toContain('summarizer');
  });

  it('sends X-Subscription-Token header', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(makeBraveResponse([]));
    vi.stubGlobal('fetch', fetchMock);

    const adapter = new BraveSearchSourceAdapter(API_KEY);
    await adapter.fetch(query, ideaId, traceId);

    const calledHeaders = ((fetchMock.mock.calls[0] as [string, RequestInit])[1].headers) as Record<string, string>;
    expect(calledHeaders['X-Subscription-Token']).toBe(API_KEY);
  });

  it('returns empty signals when no results', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(makeBraveResponse([])));

    const adapter = new BraveSearchSourceAdapter(API_KEY);
    const result = await adapter.fetch(query, ideaId, traceId);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toHaveLength(0);
  });

  it('returns error after all retries exhausted on HTTP failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }));

    const adapter = new BraveSearchSourceAdapter(API_KEY, 5_000, 1);
    const result = await adapter.fetch(query, ideaId, traceId);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().source).toBe('brave');
  });

  it('returns error on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));

    const adapter = new BraveSearchSourceAdapter(API_KEY, 5_000, 1);
    const result = await adapter.fetch(query, ideaId, traceId);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe('network error');
  });
});
