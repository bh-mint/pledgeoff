import { Result, ok, err } from 'neverthrow';
import type { Signal } from '@pledgeoff/core';
import type { ISourceAdapter, ICache } from '@pledgeoff/core';
import { SourceAdapterError } from '@pledgeoff/core';
import { createLogger, getTracer, SpanStatusCode } from '@pledgeoff/observability';

const log = createLogger({ adapter: 'brave' });
const tracer = getTracer('brave-search-source-adapter');

interface BraveWebResult {
  title: string;
  url: string;
  description: string;
}

interface BraveSearchResponse {
  web?: { results?: BraveWebResult[] };
}

const CACHE_TTL_SECONDS = 3600;
const BRAVE_API_URL = 'https://api.search.brave.com/res/v1/web/search';
const RESULTS_COUNT = 4;
const TOP_N = 2;

export class BraveSearchSourceAdapter implements ISourceAdapter {
  readonly sourceName = 'brave';

  constructor(
    private readonly apiKey: string,
    private readonly timeoutMs = 10_000,
    private readonly maxRetries = 2,
    private readonly cache?: ICache,
  ) {}

  async fetch(query: string, ideaId: string, traceId: string): Promise<Result<Signal[], SourceAdapterError>> {
    return tracer.startActiveSpan('brave.fetch', async (span) => {
      span.setAttributes({ 'adapter.name': 'brave', 'trace.id': traceId, 'idea.id': ideaId });
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
    // Search Reddit discussions via Brave Search (site:reddit.com restriction)
    const siteQuery = `site:reddit.com ${query}`;

    if (this.cache) {
      const cacheKey = `pledgeoff:brave:v1:${query}`;
      const cached = await this.cache.get<Signal[]>(cacheKey);
      if (cached) {
        log.info({ traceId, target: 'brave', operation: 'search', outcome: 'success', cacheHit: true, signalCount: cached.length }, 'Brave cache hit');
        return ok(cached.map((s) => ({ ...s, id: crypto.randomUUID(), ideaId })));
      }
    }

    const url = new URL(BRAVE_API_URL);
    url.searchParams.set('q', siteQuery);
    url.searchParams.set('count', String(RESULTS_COUNT));

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      const start = Date.now();
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);

        const response = await fetch(url.toString(), {
          headers: {
            'Accept': 'application/json',
            'X-Subscription-Token': this.apiKey,
          },
          signal: controller.signal,
        }).finally(() => clearTimeout(timer));

        if (!response.ok) {
          if (attempt < this.maxRetries) continue;
          log.warn({ traceId, target: 'brave', operation: 'search', latencyMs: Date.now() - start, outcome: 'error', errorCode: `HTTP_${response.status}` }, 'Brave search failed');
          return err(new SourceAdapterError(`HTTP ${response.status}`, this.sourceName));
        }

        const json = (await response.json()) as BraveSearchResponse;
        const results = (json.web?.results ?? []).slice(0, TOP_N);

        const signals: Signal[] = results.map((r) => ({
          id: crypto.randomUUID(),
          ideaId,
          source: 'brave' as const,
          url: r.url,
          title: r.title.slice(0, 500),
          summary: r.description.slice(0, 2000),
          sentiment: 'neutral' as const,
          fetchedAt: new Date().toISOString(),
        }));

        log.info({ traceId, target: 'brave', operation: 'search', latencyMs: Date.now() - start, outcome: 'success', signalCount: signals.length }, 'Brave signals fetched');

        if (this.cache && signals.length > 0) {
          await this.cache.set(`pledgeoff:brave:v1:${query}`, signals, CACHE_TTL_SECONDS);
        }

        return ok(signals);
      } catch (error) {
        if (attempt === this.maxRetries) {
          const message = error instanceof Error ? error.message : 'unknown error';
          log.error({ traceId, target: 'brave', operation: 'search', latencyMs: Date.now() - start, outcome: 'error', errorCode: 'MAX_RETRIES' }, `Brave search failed: ${message}`);
          return err(new SourceAdapterError(message, this.sourceName));
        }
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    }

    return err(new SourceAdapterError('max retries exceeded', this.sourceName));
  }
}
