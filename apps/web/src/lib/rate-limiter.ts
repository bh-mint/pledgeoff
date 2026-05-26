import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterMs: number };

// Fallback: single-instance in-memory (dev / when Redis not configured)
type Bucket = { count: number; resetAt: number };
const ideaBuckets = new Map<string, Bucket>();
const aiBuckets = new Map<string, Bucket>();

function inMemoryCheck(
  buckets: Map<string, Bucket>,
  userId: string,
  windowMs: number,
  max: number,
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(userId);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(userId, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }
  if (bucket.count >= max) {
    return { allowed: false, retryAfterMs: bucket.resetAt - now };
  }
  bucket.count += 1;
  return { allowed: true };
}

// Lazily initialised so that missing env vars don't crash at import time
let ideaLimiter: Ratelimit | null = null;
let aiLimiter: Ratelimit | null = null;

function getRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function getIdeaLimiter(): Ratelimit | null {
  if (ideaLimiter) return ideaLimiter;
  const redis = getRedisClient();
  if (!redis) return null;
  ideaLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '5 m'),
    prefix: 'rl:idea',
    analytics: false,
  });
  return ideaLimiter;
}

function getAiLimiter(): Ratelimit | null {
  if (aiLimiter) return aiLimiter;
  const redis = getRedisClient();
  if (!redis) return null;
  aiLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1 h'),
    prefix: 'rl:ai',
    analytics: false,
  });
  return aiLimiter;
}

export async function checkRateLimit(userId: string): Promise<RateLimitResult> {
  const limiter = getIdeaLimiter();
  if (!limiter) {
    return inMemoryCheck(ideaBuckets, userId, 5 * 60 * 1000, 10);
  }
  const { success, reset } = await limiter.limit(userId);
  if (!success) {
    return { allowed: false, retryAfterMs: Math.max(0, reset - Date.now()) };
  }
  return { allowed: true };
}

export async function checkAiRateLimit(userId: string): Promise<RateLimitResult> {
  const limiter = getAiLimiter();
  if (!limiter) {
    return inMemoryCheck(aiBuckets, userId, 60 * 60 * 1000, 20);
  }
  const { success, reset } = await limiter.limit(userId);
  if (!success) {
    return { allowed: false, retryAfterMs: Math.max(0, reset - Date.now()) };
  }
  return { allowed: true };
}
