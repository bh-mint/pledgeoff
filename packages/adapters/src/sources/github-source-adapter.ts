import { Result, ok, err } from 'neverthrow';
import type { Signal } from '@pledgeoff/core';
import type { ISourceAdapter, ICache } from '@pledgeoff/core';
import { SourceAdapterError } from '@pledgeoff/core';
import { createLogger, getTracer, SpanStatusCode } from '@pledgeoff/observability';

const log = createLogger({ adapter: 'github' });
const tracer = getTracer('github-source-adapter');

interface GitHubIssue {
  html_url: string;
  title: string;
  body: string | null;
  reactions: { '+1': number; '-1': number; total_count: number };
}

interface GitHubSearchResponse {
  items: GitHubIssue[];
}

function scoreSentiment(reactions: GitHubIssue['reactions']): Signal['sentiment'] {
  const positive = reactions['+1'];
  const negative = reactions['-1'];
  if (positive > negative + 2) return 'positive';
  if (negative > positive + 2) return 'negative';
  return 'neutral';
}

const CACHE_TTL_SECONDS = 3600;

export class GitHubSourceAdapter implements ISourceAdapter {
  readonly sourceName = 'github';

  constructor(
    private readonly pat: string = '',
    private readonly timeoutMs = 10_000,
    private readonly maxRetries = 2,
    private readonly cache?: ICache,
  ) {}

  async fetch(query: string, ideaId: string, traceId: string): Promise<Result<Signal[], SourceAdapterError>> {
    return tracer.startActiveSpan('github.fetch', async (span) => {
      span.setAttributes({ 'adapter.name': 'github', 'trace.id': traceId, 'idea.id': ideaId });
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
    const url = `https://api.github.com/search/issues?q=${encodeURIComponent(query + ' is:issue')}&per_page=10`;

    if (this.cache) {
      const cacheKey = `pledgeoff:github:v6:${query}`;
      const cached = await this.cache.get<Signal[]>(cacheKey);
      if (cached) {
        log.info({ traceId, target: 'github', operation: 'search', outcome: 'success', cacheHit: true, signalCount: cached.length }, 'GitHub cache hit');
        return ok(cached.map((s) => ({ ...s, id: crypto.randomUUID(), ideaId })));
      }
    }

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      const start = Date.now();
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);

        const headers: Record<string, string> = {
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        };
        if (this.pat) headers['Authorization'] = `Bearer ${this.pat}`;

        const response = await fetch(url, {
          headers,
          signal: controller.signal,
        }).finally(() => clearTimeout(timer));

        if (!response.ok) {
          if (attempt < this.maxRetries) continue;
          log.warn(
            { traceId, target: 'github', operation: 'search', latencyMs: Date.now() - start, outcome: 'error', errorCode: `HTTP_${response.status}` },
            'GitHub search failed',
          );
          return err(new SourceAdapterError(`HTTP ${response.status}`, this.sourceName));
        }

        const json = (await response.json()) as GitHubSearchResponse;
        const signals: Signal[] = json.items.map((issue) => ({
          id: crypto.randomUUID(),
          ideaId,
          source: 'github' as const,
          url: issue.html_url,
          title: issue.title.slice(0, 500),
          summary: (issue.body ?? issue.title).slice(0, 2000),
          sentiment: scoreSentiment(issue.reactions),
          fetchedAt: new Date().toISOString(),
        }));

        log.info(
          { traceId, target: 'github', operation: 'search', latencyMs: Date.now() - start, outcome: 'success', signalCount: signals.length },
          'GitHub signals fetched',
        );

        if (this.cache) {
          const cacheKey = `pledgeoff:github:v6:${query}`;
          await this.cache.set(cacheKey, signals, CACHE_TTL_SECONDS);
        }

        return ok(signals);
      } catch (error) {
        if (attempt === this.maxRetries) {
          const message = error instanceof Error ? error.message : 'unknown error';
          log.error(
            { traceId, target: 'github', operation: 'search', latencyMs: Date.now() - start, outcome: 'error', errorCode: 'MAX_RETRIES' },
            `GitHub fetch failed: ${message}`,
          );
          return err(new SourceAdapterError(message, this.sourceName));
        }
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    }

    return err(new SourceAdapterError('max retries exceeded', this.sourceName));
  }
}
