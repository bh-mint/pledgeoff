import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterMs: number };

// Fallback: single-instance in-memory (dev / when Redis not configured)
type Bucket = { count: number; resetAt: number };
const ideaBuckets = new Map<string, Bucket>();
const aiBuckets = new Map<string, Bucket>();
const publicBuckets = new Map<string, Bucket>();
const resendBuckets = new Map<string, Bucket>();

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();
  return first ?? 'unknown';
}

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

let publicLimiter: Ratelimit | null = null;
let resendLimiter: Ratelimit | null = null;

function getPublicLimiter(): Ratelimit | null {
  if (publicLimiter) return publicLimiter;
  const redis = getRedisClient();
  if (!redis) return null;
  publicLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 h'),
    prefix: 'rl:public',
    analytics: false,
  });
  return publicLimiter;
}

function getResendLimiter(): Ratelimit | null {
  if (resendLimiter) return resendLimiter;
  const redis = getRedisClient();
  if (!redis) return null;
  resendLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '10 m'),
    prefix: 'rl:resend',
    analytics: false,
  });
  return resendLimiter;
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

// 5 requests per hour per IP — waitlist, contact, enterprise contact
export async function checkPublicRateLimit(ip: string): Promise<RateLimitResult> {
  const limiter = getPublicLimiter();
  if (!limiter) {
    return inMemoryCheck(publicBuckets, ip, 60 * 60 * 1000, 5);
  }
  const { success, reset } = await limiter.limit(ip);
  if (!success) {
    return { allowed: false, retryAfterMs: Math.max(0, reset - Date.now()) };
  }
  return { allowed: true };
}

// 3 requests per 10 minutes per IP — resend-verification (email bombing risk)
export async function checkResendRateLimit(ip: string): Promise<RateLimitResult> {
  const limiter = getResendLimiter();
  if (!limiter) {
    return inMemoryCheck(resendBuckets, ip, 10 * 60 * 1000, 3);
  }
  const { success, reset } = await limiter.limit(ip);
  if (!success) {
    return { allowed: false, retryAfterMs: Math.max(0, reset - Date.now()) };
  }
  return { allowed: true };
}
