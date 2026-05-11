import { Redis } from '@upstash/redis';
import type { ICache } from '@pledgeoff/core';
import { createLogger } from '@pledgeoff/observability';

const log = createLogger({ adapter: 'upstash-redis' });
const SYSTEM_TRACE = 'system';

export class UpstashRedisCacheAdapter implements ICache {
  private readonly redis: Redis;

  constructor(url: string, token: string) {
    this.redis = new Redis({ url, token });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      return await this.redis.get<T>(key);
    } catch (error) {
      log.warn({ traceId: SYSTEM_TRACE, target: 'upstash', operation: 'get', outcome: 'error', cacheKey: key, errorMsg: error instanceof Error ? error.message : 'unknown' }, 'Redis GET failed — cache miss fallback');
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.set(key, value, { ex: ttlSeconds });
    } catch (error) {
      log.warn({ traceId: SYSTEM_TRACE, target: 'upstash', operation: 'set', outcome: 'error', cacheKey: key, errorMsg: error instanceof Error ? error.message : 'unknown' }, 'Redis SET failed — continuing without cache');
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      log.warn({ traceId: SYSTEM_TRACE, target: 'upstash', operation: 'del', outcome: 'error', cacheKey: key, errorMsg: error instanceof Error ? error.message : 'unknown' }, 'Redis DEL failed');
    }
  }
}
