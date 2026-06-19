import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpstashRedisCacheAdapter } from '../upstash-redis-cache-adapter';

const { mockGet, mockSet, mockDel } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockSet: vi.fn(),
  mockDel: vi.fn(),
}));

vi.mock('@upstash/redis', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Redis: vi.fn(function (this: any) {
    this.get = mockGet;
    this.set = mockSet;
    this.del = mockDel;
  }),
}));

describe('UpstashRedisCacheAdapter', () => {
  let adapter: UpstashRedisCacheAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new UpstashRedisCacheAdapter('https://test.upstash.io', 'token');
  });

  it('get returns value from Redis', async () => {
    mockGet.mockResolvedValue({ foo: 'bar' });
    expect(await adapter.get('key')).toEqual({ foo: 'bar' });
  });

  it('get returns null on Redis GET failure (graceful degradation)', async () => {
    mockGet.mockRejectedValue(new Error('connection refused'));
    expect(await adapter.get('key')).toBeNull();
  });

  it('set calls Redis with correct TTL', async () => {
    mockSet.mockResolvedValue('OK');
    await adapter.set('key', 'value', 60);
    expect(mockSet).toHaveBeenCalledWith('key', 'value', { ex: 60 });
  });

  it('set does not throw on Redis failure (graceful degradation)', async () => {
    mockSet.mockRejectedValue(new Error('timeout'));
    await expect(adapter.set('key', 'value', 60)).resolves.toBeUndefined();
  });

  it('del calls Redis del', async () => {
    mockDel.mockResolvedValue(1);
    await adapter.del('key');
    expect(mockDel).toHaveBeenCalledWith('key');
  });
});
