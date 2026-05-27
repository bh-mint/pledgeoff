import { Result, ok, err } from 'neverthrow';
import type { Signal } from '@pledgeoff/core';
import type { ISourceAdapter, ICache } from '@pledgeoff/core';
import { SourceAdapterError } from '@pledgeoff/core';
import { createLogger, getTracer, SpanStatusCode } from '@pledgeoff/observability';

const log = createLogger({ adapter: 'producthunt' });
const tracer = getTracer('product-hunt-source-adapter');

interface PHPost {
  id: string;
  name: string;
  tagline: string;
  description: string | null;
  url: string;
  votesCount: number;
}

interface PHGraphQLResponse {
  data?: {
    posts?: {
      edges: { node: PHPost }[];
    };
  };
  errors?: { message: string }[];
}

interface PHTokenResponse {
  access_token: string;
  token_type: string;
}

const CACHE_TTL_SIGNALS = 3600;
const CACHE_TTL_TOKEN = 82_800; // 23h — PH tokens last 24h
const PH_API_URL = 'https://api.producthunt.com/v2/api/graphql';
const PH_TOKEN_URL = 'https://api.producthunt.com/v2/oauth/token';

const POSTS_QUERY = `
  query SearchPosts($query: String!) {
    posts(search: { query: $query }, first: 5, order: VOTES) {
      edges {
        node {
          id
          name
          tagline
          description
          url
          votesCount
        }
      }
    }
  }
`;

function scoreSentiment(votes: number): Signal['sentiment'] {
  if (votes >= 100) return 'positive';
  if (votes < 10) return 'negative';
  return 'neutral';
}

// TODO: wire in container.ts when Product Hunt API access is approved (requires OAuth app approval).
export class ProductHuntSourceAdapter implements ISourceAdapter {
  readonly sourceName = 'producthunt';

  constructor(
    private readonly apiKey: string,
    private readonly apiSecret: string,
    private readonly timeoutMs = 10_000,
    private readonly maxRetries = 2,
    private readonly cache?: ICache,
  ) {}

  async fetch(query: string, ideaId: string, traceId: string): Promise<Result<Signal[], SourceAdapterError>> {
    return tracer.startActiveSpan('producthunt.fetch', async (span) => {
      span.setAttributes({ 'adapter.name': 'producthunt', 'trace.id': traceId, 'idea.id': ideaId });
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

  private async getAccessToken(traceId: string): Promise<string | null> {
    const cacheKey = 'pledgeoff:producthunt:token';

    if (this.cache) {
      const cached = await this.cache.get<string>(cacheKey);
      if (cached) return cached;
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(PH_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: this.apiKey,
          client_secret: this.apiSecret,
          grant_type: 'client_credentials',
        }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));

      if (!response.ok) {
        log.warn({ traceId, target: 'producthunt', operation: 'token', outcome: 'error', errorCode: `HTTP_${response.status}` }, 'PH token fetch failed');
        return null;
      }

      const json = (await response.json()) as PHTokenResponse;
      const token = json.access_token;

      if (this.cache && token) {
        await this.cache.set(cacheKey, token, CACHE_TTL_TOKEN);
      }

      return token ?? null;
    } catch {
      log.warn({ traceId, target: 'producthunt', operation: 'token', outcome: 'error' }, 'PH token request threw');
      return null;
    }
  }

  private async _fetch(query: string, ideaId: string, traceId: string): Promise<Result<Signal[], SourceAdapterError>> {
    if (this.cache) {
      const cacheKey = `pledgeoff:producthunt:v1:${query}`;
      const cached = await this.cache.get<Signal[]>(cacheKey);
      if (cached) {
        log.info({ traceId, target: 'producthunt', operation: 'search', outcome: 'success', cacheHit: true, signalCount: cached.length }, 'PH cache hit');
        return ok(cached.map((s) => ({ ...s, id: crypto.randomUUID(), ideaId })));
      }
    }

    const token = await this.getAccessToken(traceId);
    if (!token) {
      return err(new SourceAdapterError('failed to obtain access token', this.sourceName));
    }

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      const start = Date.now();
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);

        const response = await fetch(PH_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({ query: POSTS_QUERY, variables: { query } }),
          signal: controller.signal,
        }).finally(() => clearTimeout(timer));

        if (!response.ok) {
          if (attempt < this.maxRetries) continue;
          log.warn({ traceId, target: 'producthunt', operation: 'search', latencyMs: Date.now() - start, outcome: 'error', errorCode: `HTTP_${response.status}` }, 'PH search failed');
          return err(new SourceAdapterError(`HTTP ${response.status}`, this.sourceName));
        }

        const json = (await response.json()) as PHGraphQLResponse;

        if (json.errors?.length) {
          const msg = json.errors[0]?.message ?? 'GraphQL error';
          log.warn({ traceId, target: 'producthunt', operation: 'search', latencyMs: Date.now() - start, outcome: 'error', errorCode: 'GRAPHQL_ERROR' }, `PH GraphQL error: ${msg}`);
          return err(new SourceAdapterError(msg, this.sourceName));
        }

        const edges = json.data?.posts?.edges ?? [];
        const signals: Signal[] = edges.map(({ node }) => ({
          id: crypto.randomUUID(),
          ideaId,
          source: 'producthunt' as const,
          url: node.url,
          title: node.name.slice(0, 500),
          summary: (node.description ?? node.tagline).slice(0, 2000),
          sentiment: scoreSentiment(node.votesCount),
          fetchedAt: new Date().toISOString(),
        }));

        log.info({ traceId, target: 'producthunt', operation: 'search', latencyMs: Date.now() - start, outcome: 'success', signalCount: signals.length }, 'PH signals fetched');

        if (this.cache && signals.length > 0) {
          const cacheKey = `pledgeoff:producthunt:v1:${query}`;
          await this.cache.set(cacheKey, signals, CACHE_TTL_SIGNALS);
        }

        return ok(signals);
      } catch (error) {
        if (attempt === this.maxRetries) {
          const message = error instanceof Error ? error.message : 'unknown error';
          log.error({ traceId, target: 'producthunt', operation: 'search', latencyMs: Date.now() - start, outcome: 'error', errorCode: 'MAX_RETRIES' }, `PH fetch failed: ${message}`);
          return err(new SourceAdapterError(message, this.sourceName));
        }
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    }

    return err(new SourceAdapterError('max retries exceeded', this.sourceName));
  }
}
