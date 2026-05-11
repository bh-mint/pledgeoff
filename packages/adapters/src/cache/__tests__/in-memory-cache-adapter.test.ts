import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InMemoryCacheAdapter } from '../in-memory-cache-adapter';

describe('InMemoryCacheAdapter', () => {
  let cache: InMemoryCacheAdapter;

  beforeEach(() => {
    cache = new InMemoryCacheAdapter();
  });

  it('returns null for missing key', async () => {
    expect(await cache.get('missing')).toBeNull();
  });

  it('stores and retrieves a value', async () => {
    await cache.set('key', { foo: 'bar' }, 60);
    expect(await cache.get('key')).toEqual({ foo: 'bar' });
  });

  it('returns null after TTL expires', async () => {
    vi.useFakeTimers();
    await cache.set('key', 'value', 1);
    vi.advanceTimersByTime(1001);
    expect(await cache.get('key')).toBeNull();
    vi.useRealTimers();
  });

  it('deletes a key', async () => {
    await cache.set('key', 'value', 60);
    await cache.del('key');
    expect(await cache.get('key')).toBeNull();
  });

  it('handles del on missing key without error', async () => {
    await expect(cache.del('nonexistent')).resolves.toBeUndefined();
  });
});
