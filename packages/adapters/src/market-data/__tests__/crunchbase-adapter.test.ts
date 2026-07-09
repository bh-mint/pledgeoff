import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MarketDataError } from '@pledgeoff/core';
import type { ICache } from '@pledgeoff/core';
import { CrunchbaseAdapter } from '../crunchbase-adapter';

const traceId = 'trace-123';

const autocompleteHit = {
  entities: [{ identifier: { permalink: 'notion', value: 'Notion' } }],
};

const entityResponse = {
  properties: {
    identifier: { value: 'Notion' },
    funding_total: { value_usd: 343_000_000 },
    num_employees_enum: 'c_00501_01000',
    founded_on: { value: '2013-01-01' },
    last_funding_type: 'series_c',
    last_funding_at: '2021-10-08',
  },
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function makeCache(): ICache & { store: Map<string, unknown> } {
  const store = new Map<string, unknown>();
  return {
    store,
    async get<T>(key: string): Promise<T | null> {
      return (store.get(key) as T | undefined) ?? null;
    },
    async set<T>(key: string, value: T): Promise<void> {
      store.set(key, value);
    },
    async del(key: string): Promise<void> {
      store.delete(key);
    },
  };
}

describe('CrunchbaseAdapter', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const fetchMock = () => fetch as unknown as ReturnType<typeof vi.fn>;

  it('resolves an organization with parsed funding, employees, and founded year', async () => {
    fetchMock()
      .mockResolvedValueOnce(jsonResponse(autocompleteHit))
      .mockResolvedValueOnce(jsonResponse(entityResponse));

    const adapter = new CrunchbaseAdapter('key');
    const result = await adapter.findOrganization('Notion', traceId);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        name: 'Notion',
        fundingTotalUsd: 343_000_000,
        numEmployeesRange: '501–1000',
        foundedYear: 2013,
        lastFundingType: 'series_c',
        lastFundingAt: '2021-10-08',
      });
    }
  });

  it('returns null when autocomplete has no confident match', async () => {
    fetchMock().mockResolvedValueOnce(
      jsonResponse({ entities: [{ identifier: { permalink: 'acme-corp', value: 'Acme Corporation' } }] }),
    );

    const adapter = new CrunchbaseAdapter('key');
    const result = await adapter.findOrganization('Notion', traceId);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect(result.value).toBeNull();
    // No entity request wasted on a non-match
    expect(fetchMock()).toHaveBeenCalledTimes(1);
  });

  it('returns MarketDataError on non-200 responses', async () => {
    fetchMock().mockResolvedValueOnce(jsonResponse({ error: 'rate limited' }, 429));

    const adapter = new CrunchbaseAdapter('key');
    const result = await adapter.findOrganization('Notion', traceId);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toBeInstanceOf(MarketDataError);
  });

  it('serves the second lookup from cache, including cached misses', async () => {
    fetchMock().mockResolvedValueOnce(jsonResponse({ entities: [] }));
    const cache = makeCache();

    const adapter = new CrunchbaseAdapter('key', 8_000, cache);
    const first = await adapter.findOrganization('Unknown Startup', traceId);
    const second = await adapter.findOrganization('Unknown Startup', traceId);

    expect(first.isOk() && first.value).toBeNull();
    expect(second.isOk() && second.value).toBeNull();
    // One HTTP round-trip total — the miss itself was cached
    expect(fetchMock()).toHaveBeenCalledTimes(1);
  });

  it('handles missing optional fields as nulls', async () => {
    fetchMock()
      .mockResolvedValueOnce(jsonResponse(autocompleteHit))
      .mockResolvedValueOnce(jsonResponse({ properties: { identifier: { value: 'Notion' } } }));

    const adapter = new CrunchbaseAdapter('key');
    const result = await adapter.findOrganization('Notion', traceId);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        name: 'Notion',
        fundingTotalUsd: null,
        numEmployeesRange: null,
        foundedYear: null,
        lastFundingType: null,
        lastFundingAt: null,
      });
    }
  });
});
