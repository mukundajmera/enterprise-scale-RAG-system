import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Check for required environment variables
if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  console.warn(
    'UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set. Rate limiting will be disabled.'
  );
}

// Create Redis client
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null;

// Rate limiter for document uploads (10 per hour)
export const uploadRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 h'),
      prefix: 'ratelimit:upload',
      analytics: true,
    })
  : null;

// Rate limiter for queries (100 per hour)
export const queryRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '1 h'),
      prefix: 'ratelimit:query',
      analytics: true,
    })
  : null;

/**
 * Check rate limit for a given user and operation type
 * Returns { success: true } if rate limit is disabled or not exceeded
 */
export async function checkRateLimit(
  userId: string,
  type: 'upload' | 'query'
): Promise<{ success: boolean; limit?: number; remaining?: number; reset?: number }> {
  const limiter = type === 'upload' ? uploadRateLimiter : queryRateLimiter;

  if (!limiter) {
    // Rate limiting disabled, allow all requests
    return { success: true };
  }

  try {
    const { success, limit, remaining, reset } = await limiter.limit(userId);
    return { success, limit, remaining, reset };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // On error, allow the request but log it
    return { success: true };
  }
}

/**
 * Get cache client for storing temporary data
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;

  try {
    const value = await redis.get<T>(key);
    return value;
  } catch (error) {
    console.error('Cache get failed:', error);
    return null;
  }
}

/**
 * Set cache with TTL
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number = 300
): Promise<boolean> {
  if (!redis) return false;

  try {
    await redis.set(key, value, { ex: ttlSeconds });
    return true;
  } catch (error) {
    console.error('Cache set failed:', error);
    return false;
  }
}

/**
 * Delete cache key
 */
export async function cacheDelete(key: string): Promise<boolean> {
  if (!redis) return false;

  try {
    await redis.del(key);
    return true;
  } catch (error) {
    console.error('Cache delete failed:', error);
    return false;
  }
}
