import { Result, ok, err } from 'neverthrow';
import type { Signal } from '@pledgeoff/core';
import type { ISourceAdapter, ICache } from '@pledgeoff/core';
import { SourceAdapterError } from '@pledgeoff/core';
import { createLogger, getTracer, SpanStatusCode } from '@pledgeoff/observability';

const log = createLogger({ adapter: 'devto' });
const tracer = getTracer('devto-source-adapter');

interface DevToArticle {
  id: number;
  title: string;
  description: string | null;
  url: string;
  positive_reactions_count: number;
}

const CACHE_TTL_SECONDS = 3600;
const DEVTO_API_URL = 'https://dev.to/api/articles';
const PER_PAGE = 10;
const TOP_N = 2;

function scoreSentiment(reactions: number): Signal['sentiment'] {
  if (reactions >= 50) return 'positive';
  if (reactions < 5) return 'negative';
  return 'neutral';
}

export class DevToSourceAdapter implements ISourceAdapter {
  readonly sourceName = 'devto';

  constructor(
    private readonly timeoutMs = 10_000,
    private readonly maxRetries = 2,
    private readonly cache?: ICache,
  ) {}

  async fetch(query: string, ideaId: string, traceId: string): Promise<Result<Signal[], SourceAdapterError>> {
    return tracer.startActiveSpan('devto.fetch', async (span) => {
      span.setAttributes({ 'adapter.name': 'devto', 'trace.id': traceId, 'idea.id': ideaId });
      const result = await this._fetch(query, ideaId, traceId);
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

  private async _fetch(query: string, ideaId: string, traceId: string): Promise<Result<Signal[], SourceAdapterError>> {
    if (this.cache) {
      const cacheKey = `pledgeoff:devto:v1:${query}`;
      const cached = await this.cache.get<Signal[]>(cacheKey);
      if (cached) {
        log.info({ traceId, target: 'devto', operation: 'search', outcome: 'success', cacheHit: true, signalCount: cached.length }, 'DevTo cache hit');
        return ok(cached.map((s) => ({ ...s, id: crypto.randomUUID(), ideaId })));
      }
    }

    const url = new URL(DEVTO_API_URL);
    url.searchParams.set('q', query);
    url.searchParams.set('per_page', String(PER_PAGE));

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      const start = Date.now();
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);

        const response = await fetch(url.toString(), {
          headers: { 'Accept': 'application/json' },
          signal: controller.signal,
        }).finally(() => clearTimeout(timer));

        if (!response.ok) {
          if (attempt < this.maxRetries) continue;
          log.warn({ traceId, target: 'devto', operation: 'search', latencyMs: Date.now() - start, outcome: 'error', errorCode: `HTTP_${response.status}` }, 'DevTo search failed');
          return err(new SourceAdapterError(`HTTP ${response.status}`, this.sourceName));
        }

        const articles = (await response.json()) as DevToArticle[];

        // Filter to articles containing at least one query keyword in title, then top N by reactions
        const keywords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
        const relevant = articles.filter((a) =>
          keywords.some((kw) => a.title.toLowerCase().includes(kw)),
        );
        const pool = relevant.length > 0 ? relevant : articles;
        const top = [...pool]
          .sort((a, b) => b.positive_reactions_count - a.positive_reactions_count)
          .slice(0, TOP_N);

        const signals: Signal[] = top.map((article) => ({
          id: crypto.randomUUID(),
          ideaId,
          source: 'devto' as const,
          url: article.url,
          title: article.title.slice(0, 500),
          summary: (article.description ?? article.title).slice(0, 2000),
          sentiment: scoreSentiment(article.positive_reactions_count),
          fetchedAt: new Date().toISOString(),
        }));

        log.info({ traceId, target: 'devto', operation: 'search', latencyMs: Date.now() - start, outcome: 'success', signalCount: signals.length }, 'DevTo signals fetched');

        if (this.cache && signals.length > 0) {
          await this.cache.set(`pledgeoff:devto:v1:${query}`, signals, CACHE_TTL_SECONDS);
        }

        return ok(signals);
      } catch (error) {
        if (attempt === this.maxRetries) {
          const message = error instanceof Error ? error.message : 'unknown error';
          log.error({ traceId, target: 'devto', operation: 'search', latencyMs: Date.now() - start, outcome: 'error', errorCode: 'MAX_RETRIES' }, `DevTo fetch failed: ${message}`);
          return err(new SourceAdapterError(message, this.sourceName));
        }
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    }

    return err(new SourceAdapterError('max retries exceeded', this.sourceName));
  }
}
