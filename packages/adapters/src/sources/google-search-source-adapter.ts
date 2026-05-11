import { Result, ok, err } from 'neverthrow';
import type { Signal } from '@pledgeoff/core';
import type { ISourceAdapter, ICache } from '@pledgeoff/core';
import { SourceAdapterError } from '@pledgeoff/core';
import { createLogger, getTracer, SpanStatusCode } from '@pledgeoff/observability';

const log = createLogger({ adapter: 'google' });
const tracer = getTracer('google-search-source-adapter');

interface GoogleSearchItem {
  title: string;
  link: string;
  snippet: string;
}

interface GoogleSearchResponse {
  items?: GoogleSearchItem[];
  error?: { message: string; code: number };
}

const CACHE_TTL_SECONDS = 3600;
const GOOGLE_API_URL = 'https://www.googleapis.com/customsearch/v1';

export class GoogleSearchSourceAdapter implements ISourceAdapter {
  readonly sourceName = 'google';

  constructor(
    private readonly apiKey: string,
    private readonly searchEngineId: string,
    private readonly timeoutMs = 10_000,
    private readonly maxRetries = 2,
    private readonly cache?: ICache,
  ) {}

  async fetch(query: string, ideaId: string, traceId: string): Promise<Result<Signal[], SourceAdapterError>> {
    return tracer.startActiveSpan('google.fetch', async (span) => {
      span.setAttributes({ 'adapter.name': 'google', 'trace.id': traceId, 'idea.id': ideaId });
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
    // Search Reddit discussions via Google Custom Search (site:reddit.com restriction)
    const siteQuery = `site:reddit.com ${query}`;

    if (this.cache) {
      const cacheKey = `pledgeoff:google:v1:${query}`;
      const cached = await this.cache.get<Signal[]>(cacheKey);
      if (cached) {
        log.info({ traceId, target: 'google', operation: 'search', outcome: 'success', cacheHit: true, signalCount: cached.length }, 'Google cache hit');
        return ok(cached.map((s) => ({ ...s, id: crypto.randomUUID(), ideaId })));
      }
    }

    const url = new URL(GOOGLE_API_URL);
    url.searchParams.set('key', this.apiKey);
    url.searchParams.set('cx', this.searchEngineId);
    url.searchParams.set('q', siteQuery);
    url.searchParams.set('num', '5');

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
          log.warn({ traceId, target: 'google', operation: 'search', latencyMs: Date.now() - start, outcome: 'error', errorCode: `HTTP_${response.status}` }, 'Google search failed');
          return err(new SourceAdapterError(`HTTP ${response.status}`, this.sourceName));
        }

        const json = (await response.json()) as GoogleSearchResponse;

        if (json.error) {
          log.warn({ traceId, target: 'google', operation: 'search', latencyMs: Date.now() - start, outcome: 'error', errorCode: `API_${json.error.code}` }, `Google API error: ${json.error.message}`);
          return err(new SourceAdapterError(json.error.message, this.sourceName));
        }

        const items = json.items ?? [];
        const signals: Signal[] = items.map((item) => ({
          id: crypto.randomUUID(),
          ideaId,
          source: 'google' as const,
          url: item.link,
          title: item.title.slice(0, 500),
          summary: item.snippet.slice(0, 2000),
          sentiment: 'neutral' as const,
          fetchedAt: new Date().toISOString(),
        }));

        log.info({ traceId, target: 'google', operation: 'search', latencyMs: Date.now() - start, outcome: 'success', signalCount: signals.length }, 'Google signals fetched');

        if (this.cache && signals.length > 0) {
          const cacheKey = `pledgeoff:google:v1:${query}`;
          await this.cache.set(cacheKey, signals, CACHE_TTL_SECONDS);
        }

        return ok(signals);
      } catch (error) {
        if (attempt === this.maxRetries) {
          const message = error instanceof Error ? error.message : 'unknown error';
          log.error({ traceId, target: 'google', operation: 'search', latencyMs: Date.now() - start, outcome: 'error', errorCode: 'MAX_RETRIES' }, `Google search failed: ${message}`);
          return err(new SourceAdapterError(message, this.sourceName));
        }
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    }

    return err(new SourceAdapterError('max retries exceeded', this.sourceName));
  }
}
