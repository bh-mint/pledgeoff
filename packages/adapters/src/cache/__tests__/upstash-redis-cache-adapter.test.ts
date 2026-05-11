import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpstashRedisCacheAdapter } from '../upstash-redis-cache-adapter';

vi.mock('@upstash/redis', () => {
  const get = vi.fn();
  const set = vi.fn();
  const del = vi.fn();
  return {
    Redis: vi.fn().mockImplementation(() => ({ get, set, del })),
    _mocks: { get, set, del },
  };
});

async function getMocks() {
  const mod = await import('@upstash/redis');
  return (mod as unknown as { _mocks: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn>; del: ReturnType<typeof vi.fn> } })._mocks;
}

describe('UpstashRedisCacheAdapter', () => {
  let adapter: UpstashRedisCacheAdapter;

  beforeEach(async () => {
    const { get, set, del } = await getMocks();
    get.mockReset();
    set.mockReset();
    del.mockReset();
    adapter = new UpstashRedisCacheAdapter('https://test.upstash.io', 'token');
  });

  it('get returns value from Redis', async () => {
    const { get } = await getMocks();
    get.mockResolvedValue({ foo: 'bar' });
    expect(await adapter.get('key')).toEqual({ foo: 'bar' });
  });

  it('get returns null on Redis GET failure (graceful degradation)', async () => {
    const { get } = await getMocks();
    get.mockRejectedValue(new Error('connection refused'));
    expect(await adapter.get('key')).toBeNull();
  });

  it('set calls Redis with correct TTL', async () => {
    const { set } = await getMocks();
    set.mockResolvedValue('OK');
    await adapter.set('key', 'value', 60);
    expect(set).toHaveBeenCalledWith('key', 'value', { ex: 60 });
  });

  it('set does not throw on Redis failure (graceful degradation)', async () => {
    const { set } = await getMocks();
    set.mockRejectedValue(new Error('timeout'));
    await expect(adapter.set('key', 'value', 60)).resolves.toBeUndefined();
  });

  it('del calls Redis del', async () => {
    const { del } = await getMocks();
    del.mockResolvedValue(1);
    await adapter.del('key');
    expect(del).toHaveBeenCalledWith('key');
  });
});
