import { Result, ok, err } from 'neverthrow';
import type { Signal } from '@pledgeoff/core';
import type { ISourceAdapter, ICache } from '@pledgeoff/core';
import { SourceAdapterError } from '@pledgeoff/core';
import { createLogger, getTracer, SpanStatusCode } from '@pledgeoff/observability';

const log = createLogger({ adapter: 'hn' });
const tracer = getTracer('hn-source-adapter');

interface HNHit {
  objectID: string;
  title: string;
  url: string | null;
  points: number | null;
  story_text: string | null;
  num_comments: number | null;
}

interface HNResponse {
  hits: HNHit[];
}

function scoreSentiment(points: number | null): Signal['sentiment'] {
  const p = points ?? 0;
  if (p >= 50) return 'positive';
  if (p < 5)   return 'negative';
  return 'neutral';
}

const CACHE_TTL_SECONDS = 3600;

export class HNSourceAdapter implements ISourceAdapter {
  readonly sourceName = 'hn';

  constructor(
    private readonly timeoutMs = 10_000,
    private readonly maxRetries = 3,
    private readonly cache?: ICache,
  ) {}

  async fetch(query: string, ideaId: string, traceId: string): Promise<Result<Signal[], SourceAdapterError>> {
    return tracer.startActiveSpan('hn.fetch', async (span) => {
      span.setAttributes({ 'adapter.name': 'hn', 'trace.id': traceId, 'idea.id': ideaId });
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
    const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=5&numericFilters=points%3E0`;

    if (this.cache) {
      const cacheKey = `pledgeoff:hn:v1:${query}`;
      const cached = await this.cache.get<Signal[]>(cacheKey);
      if (cached) {
        log.info({ traceId, target: 'hn', operation: 'search', outcome: 'success', cacheHit: true, signalCount: cached.length }, 'HN cache hit');
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
            { traceId, target: 'hn', operation: 'search', latencyMs: Date.now() - start, outcome: 'error', errorCode: `HTTP_${response.status}` },
            'HN search failed',
          );
          return err(new SourceAdapterError(`HTTP ${response.status}`, this.sourceName));
        }

        const json = (await response.json()) as HNResponse;
        const signals: Signal[] = json.hits.map((hit) => ({
          id: crypto.randomUUID(),
          ideaId,
          source: 'hn' as const,
          url: hit.url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`,
          title: hit.title.slice(0, 500),
          summary: (hit.story_text ?? hit.title).slice(0, 2000),
          sentiment: scoreSentiment(hit.points),
          fetchedAt: new Date().toISOString(),
        }));

        log.info(
          { traceId, target: 'hn', operation: 'search', latencyMs: Date.now() - start, outcome: 'success', signalCount: signals.length },
          'HN signals fetched',
        );

        if (this.cache) {
          const cacheKey = `pledgeoff:hn:v1:${query}`;
          await this.cache.set(cacheKey, signals, CACHE_TTL_SECONDS);
        }

        return ok(signals);
      } catch (error) {
        if (attempt === this.maxRetries) {
          const message = error instanceof Error ? error.message : 'unknown error';
          log.error(
            { traceId, target: 'hn', operation: 'search', latencyMs: Date.now() - start, outcome: 'error', errorCode: 'MAX_RETRIES' },
            `HN fetch failed: ${message}`,
          );
          return err(new SourceAdapterError(message, this.sourceName));
        }
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    }

    return err(new SourceAdapterError('max retries exceeded', this.sourceName));
  }
}
