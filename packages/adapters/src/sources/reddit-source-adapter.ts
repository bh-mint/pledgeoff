import { Result, ok, err } from 'neverthrow';
import type { Signal } from '@pledgeoff/core';
import type { ISourceAdapter, ICache } from '@pledgeoff/core';
import { SourceAdapterError } from '@pledgeoff/core';
import { createLogger, getTracer, SpanStatusCode } from '@pledgeoff/observability';

const log = createLogger({ adapter: 'reddit' });
const tracer = getTracer('reddit-source-adapter');

interface RedditPost {
  data: {
    id: string;
    url: string;
    title: string;
    selftext: string;
    score: number;
    permalink: string;
  };
}

interface RedditResponse {
  data: { children: RedditPost[] };
}

function scoreSentiment(score: number): Signal['sentiment'] {
  if (score > 10) return 'positive';
  if (score < 0) return 'negative';
  return 'neutral';
}

const CACHE_TTL_SECONDS = 3600; // 1 hour

export class RedditSourceAdapter implements ISourceAdapter {
  readonly sourceName = 'reddit';

  constructor(
    private readonly timeoutMs = 10_000,
    private readonly maxRetries = 3,
    private readonly cache?: ICache,
  ) {}

  async fetch(ideaText: string, ideaId: string, traceId: string): Promise<Result<Signal[], SourceAdapterError>> {
    return tracer.startActiveSpan('reddit.fetch', async (span) => {
      span.setAttributes({ 'adapter.name': 'reddit', 'trace.id': traceId, 'idea.id': ideaId });
      const result = await this._fetch(ideaText, ideaId, traceId);
      if (result.isErr()) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: result.error.message });
      } else {
        span.setAttributes({ 'signal.count': result.value.length });
        span.setStatus({ code: SpanStatusCode.OK });
      }
      span.end();
      return result;
    });
  }

  private async _fetch(ideaText: string, ideaId: string, traceId: string): Promise<Result<Signal[], SourceAdapterError>> {
    // Use first 5 words as keywords — full sentences don't match Reddit posts
    const queryText = ideaText.trim().split(/\s+/).slice(0, 5).join(' ');
    const query = encodeURIComponent(queryText);
    const url = `https://www.reddit.com/search.json?q=${query}&sort=relevance&limit=10&type=link,self`;

    if (this.cache) {
      const cacheKey = `pledgeoff:reddit:v1:${queryText}`;
      const cached = await this.cache.get<Signal[]>(cacheKey);
      if (cached) {
        log.info({ traceId, target: 'reddit', operation: 'search', outcome: 'success', cacheHit: true, signalCount: cached.length }, 'Reddit cache hit');
        return ok(cached.map((s) => ({ ...s, id: crypto.randomUUID(), ideaId })));
      }
    }

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      const start = Date.now();
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);

        const response = await fetch(url, {
          headers: { 'User-Agent': 'PledgeOFF/1.0 (decision intelligence platform)' },
          signal: controller.signal,
        }).finally(() => clearTimeout(timer));

        if (!response.ok) {
          if (attempt < this.maxRetries) continue;
          log.warn(
            { traceId, target: 'reddit', operation: 'search', latencyMs: Date.now() - start, outcome: 'error', errorCode: `HTTP_${response.status}` },
            'Reddit search failed',
          );
          return err(new SourceAdapterError(`HTTP ${response.status}`, this.sourceName));
        }

        const json = (await response.json()) as RedditResponse;
        const signals: Signal[] = json.data.children.map((post) => ({
          id: crypto.randomUUID(),
          ideaId,
          source: 'reddit' as const,
          url: `https://reddit.com${post.data.permalink}`,
          title: post.data.title.slice(0, 500),
          summary: post.data.selftext.slice(0, 2000) || post.data.title,
          sentiment: scoreSentiment(post.data.score),
          fetchedAt: new Date().toISOString(),
        }));

        log.info(
          { traceId, target: 'reddit', operation: 'search', latencyMs: Date.now() - start, outcome: 'success', signalCount: signals.length },
          'Reddit signals fetched',
        );

        if (this.cache) {
          const cacheKey = `pledgeoff:reddit:v1:${queryText}`;
          await this.cache.set(cacheKey, signals, CACHE_TTL_SECONDS);
        }

        return ok(signals);
      } catch (error) {
        if (attempt === this.maxRetries) {
          const message = error instanceof Error ? error.message : 'unknown error';
          log.error(
            { traceId, target: 'reddit', operation: 'search', latencyMs: Date.now() - start, outcome: 'error', errorCode: 'MAX_RETRIES' },
            `Reddit fetch failed: ${message}`,
          );
          return err(new SourceAdapterError(message, this.sourceName));
        }
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    }

    return err(new SourceAdapterError('max retries exceeded', this.sourceName));
  }
}
