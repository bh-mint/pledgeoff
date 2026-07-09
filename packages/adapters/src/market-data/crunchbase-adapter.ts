import { Result, ok, err } from 'neverthrow';
import type { IMarketDataRepository, CompetitorMarketData, ICache } from '@pledgeoff/core';
import { MarketDataError } from '@pledgeoff/core';
import { createLogger, getTracer, SpanStatusCode } from '@pledgeoff/observability';

const log = createLogger({ adapter: 'crunchbase' });
const tracer = getTracer('crunchbase-adapter');

const CRUNCHBASE_API_URL = 'https://api.crunchbase.com/api/v4';
// Basic (free) tier: 200 requests/day. Each lookup costs 2 requests
// (autocomplete + entity), so cache hits are the norm, not an optimization.
const CACHE_TTL_SECONDS = 86_400;
const ENTITY_FIELD_IDS = [
  'identifier',
  'funding_total',
  'num_employees_enum',
  'founded_on',
  'last_funding_type',
  'last_funding_at',
].join(',');

interface CrunchbaseAutocompleteResponse {
  entities?: Array<{
    identifier?: { permalink?: string; value?: string };
  }>;
}

interface CrunchbaseEntityResponse {
  properties?: {
    identifier?: { value?: string };
    funding_total?: { value_usd?: number };
    num_employees_enum?: string;
    founded_on?: { value?: string };
    last_funding_type?: string;
    last_funding_at?: string;
  };
}

/** "c_00011_00050" → "11–50"; "c_10001_max" → "10001+" */
function formatEmployeesEnum(value: string | undefined): string | null {
  if (!value) return null;
  const m = value.match(/^c_(\d+)_(\d+|max)$/);
  if (!m) return null;
  const low = String(Number(m[1]));
  return m[2] === 'max' ? `${low}+` : `${low}–${Number(m[2])}`;
}

/**
 * A wrong-company match poisons the prompt with false "verified" data, so the
 * matched name must contain the query (or vice versa) after normalization.
 */
function isConfidentMatch(query: string, matched: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const a = norm(query);
  const b = norm(matched);
  if (a.length < 3 || b.length < 3) return a === b;
  return a.includes(b) || b.includes(a);
}

type CachedLookup = { found: CompetitorMarketData | null };

export class CrunchbaseAdapter implements IMarketDataRepository {
  constructor(
    private readonly apiKey: string,
    private readonly timeoutMs = 8_000,
    private readonly cache?: ICache,
  ) {}

  async findOrganization(
    name: string,
    traceId: string,
  ): Promise<Result<CompetitorMarketData | null, MarketDataError>> {
    return tracer.startActiveSpan('crunchbase.findOrganization', async (span) => {
      span.setAttributes({ 'adapter.name': 'crunchbase', 'trace.id': traceId });
      const result = await this._findOrganization(name, traceId);
      if (result.isErr()) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: result.error.message });
      } else {
        span.setAttributes({ 'crunchbase.found': result.value !== null });
        span.setStatus({ code: SpanStatusCode.OK });
      }
      span.end();
      return result;
    });
  }

  private async _findOrganization(
    name: string,
    traceId: string,
  ): Promise<Result<CompetitorMarketData | null, MarketDataError>> {
    const cacheKey = `pledgeoff:crunchbase:v1:${name.toLowerCase().trim()}`;
    if (this.cache) {
      // Misses are cached too — retrying a not-found name burns daily quota.
      const cached = await this.cache.get<CachedLookup>(cacheKey);
      if (cached) return ok(cached.found);
    }

    const start = Date.now();

    const permalinkResult = await this.resolvePermalink(name, traceId);
    if (permalinkResult.isErr()) return err(permalinkResult.error);

    let found: CompetitorMarketData | null = null;
    if (permalinkResult.value !== null) {
      const entityResult = await this.fetchEntity(permalinkResult.value, traceId);
      if (entityResult.isErr()) return err(entityResult.error);
      found = entityResult.value;
    }

    log.info(
      { traceId, target: 'crunchbase', operation: 'findOrganization', latencyMs: Date.now() - start, success: true, found: found !== null },
      'Crunchbase lookup completed',
    );

    if (this.cache) {
      await this.cache.set<CachedLookup>(cacheKey, { found }, CACHE_TTL_SECONDS);
    }
    return ok(found);
  }

  private async resolvePermalink(
    name: string,
    traceId: string,
  ): Promise<Result<string | null, MarketDataError>> {
    const url = `${CRUNCHBASE_API_URL}/autocompletes?query=${encodeURIComponent(name)}&collection_ids=organizations&limit=1`;
    const jsonResult = await this.request<CrunchbaseAutocompleteResponse>(url, 'autocomplete', traceId);
    if (jsonResult.isErr()) return err(jsonResult.error);

    const entity = jsonResult.value?.entities?.[0];
    const permalink = entity?.identifier?.permalink;
    const matchedName = entity?.identifier?.value;
    if (!permalink || !matchedName || !isConfidentMatch(name, matchedName)) return ok(null);
    return ok(permalink);
  }

  private async fetchEntity(
    permalink: string,
    traceId: string,
  ): Promise<Result<CompetitorMarketData | null, MarketDataError>> {
    const url = `${CRUNCHBASE_API_URL}/entities/organizations/${encodeURIComponent(permalink)}?field_ids=${ENTITY_FIELD_IDS}`;
    const jsonResult = await this.request<CrunchbaseEntityResponse>(url, 'entity', traceId);
    if (jsonResult.isErr()) return err(jsonResult.error);

    const p = jsonResult.value?.properties;
    if (!p?.identifier?.value) return ok(null);

    return ok({
      name: p.identifier.value,
      fundingTotalUsd: p.funding_total?.value_usd ?? null,
      numEmployeesRange: formatEmployeesEnum(p.num_employees_enum),
      foundedYear: p.founded_on?.value ? Number(p.founded_on.value.slice(0, 4)) : null,
      lastFundingType: p.last_funding_type ?? null,
      lastFundingAt: p.last_funding_at ?? null,
    });
  }

  private async request<T>(
    url: string,
    operation: string,
    traceId: string,
  ): Promise<Result<T, MarketDataError>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const start = Date.now();

    try {
      const res = await fetch(url, {
        headers: { 'X-cb-user-key': this.apiKey, Accept: 'application/json' },
        signal: controller.signal,
      });

      if (!res.ok) {
        log.error(
          { traceId, target: 'crunchbase', operation, latencyMs: Date.now() - start, success: false, status: res.status },
          'Crunchbase request failed',
        );
        return err(new MarketDataError(`Crunchbase ${operation} returned HTTP ${res.status}`));
      }

      return ok((await res.json()) as T);
    } catch (e) {
      const isTimeout = e instanceof Error && e.name === 'AbortError';
      log.error(
        { traceId, target: 'crunchbase', operation, latencyMs: Date.now() - start, success: false, error: String(e) },
        isTimeout ? 'Crunchbase request timed out' : 'Crunchbase request threw',
      );
      return err(new MarketDataError(isTimeout ? `Crunchbase ${operation} timed out after ${this.timeoutMs}ms` : `Crunchbase ${operation} failed: ${String(e)}`));
    } finally {
      clearTimeout(timer);
    }
  }
}
