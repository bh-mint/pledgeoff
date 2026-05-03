import { describe, it, expect, vi, afterEach } from 'vitest';
import { GitHubSourceAdapter } from '../github-source-adapter';

const ideaId = crypto.randomUUID();
const traceId = crypto.randomUUID();
const ideaText = 'App to track daily habits and productivity metrics';
const PAT = 'ghp_test_token';

const makeGitHubResponse = (overrides: Partial<{ positive: number; negative: number; body: string | null }> = {}) => ({
  items: [
    {
      html_url: 'https://github.com/owner/repo/issues/1',
      title: 'Feature: habit tracking integration',
      body: Object.hasOwn(overrides, 'body') ? overrides.body : 'This would be really useful for productivity tools',
      reactions: {
        '+1': overrides.positive ?? 20,
        '-1': overrides.negative ?? 2,
        total_count: 22,
      },
    },
  ],
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GitHubSourceAdapter', () => {
  it('returns signals on successful fetch', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => makeGitHubResponse(),
    }));

    const adapter = new GitHubSourceAdapter(PAT);
    const result = await adapter.fetch(ideaText, ideaId, traceId);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const [first] = result.value;
      expect(result.value).toHaveLength(1);
      expect(first?.source).toBe('github');
      expect(first?.ideaId).toBe(ideaId);
      expect(first?.sentiment).toBe('positive');
    }
  });

  it('scores negative sentiment when downvotes dominate', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => makeGitHubResponse({ positive: 1, negative: 10 }),
    }));

    const adapter = new GitHubSourceAdapter(PAT);
    const result = await adapter.fetch(ideaText, ideaId, traceId);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const [first] = result.value;
      expect(first?.sentiment).toBe('negative');
    }
  });

  it('uses title as summary fallback when body is null', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => makeGitHubResponse({ body: null }),
    }));

    const adapter = new GitHubSourceAdapter(PAT);
    const result = await adapter.fetch(ideaText, ideaId, traceId);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const [first] = result.value;
      expect(first?.summary).toBe('Feature: habit tracking integration');
    }
  });

  it('sends Authorization header with PAT', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => makeGitHubResponse(),
    });
    vi.stubGlobal('fetch', mockFetch);

    const adapter = new GitHubSourceAdapter(PAT);
    await adapter.fetch(ideaText, ideaId, traceId);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${PAT}` }),
      }),
    );
  });

  it('returns error after all retries on HTTP failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }));

    const adapter = new GitHubSourceAdapter(PAT, 10_000, 2);
    const result = await adapter.fetch(ideaText, ideaId, traceId);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.source).toBe('github');
    }
  });
});
