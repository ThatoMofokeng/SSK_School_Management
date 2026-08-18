/**
 * Rate Limiting Utility
 *
 * DEVELOPMENT: Uses in-memory storage (resets on server restart)
 * PRODUCTION: Upgrade to Redis/Upstash for distributed rate limiting
 *
 * Usage:
 *   import { checkRateLimit } from '@/lib/ratelimit';
 *   await checkRateLimit(userId, 'create-student');
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// In-memory store (⚠️ WARNING: Resets on server restart, not suitable for multi-instance deployments)
const store = new Map<string, RateLimitRecord>();

// Rate limit configurations for different action types
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Mutations (create/update/delete)
  'mutation': { maxRequests: 10, windowMs: 60 * 1000 }, // 10 per minute
  'create': { maxRequests: 5, windowMs: 60 * 1000 },    // 5 creates per minute
  'delete': { maxRequests: 5, windowMs: 60 * 1000 },    // 5 deletes per minute
  'update': { maxRequests: 10, windowMs: 60 * 1000 },   // 10 updates per minute

  // Read operations (less strict)
  'query': { maxRequests: 60, windowMs: 60 * 1000 },    // 60 per minute

  // Authentication
  'login': { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 per 15 minutes

  // Default fallback
  'default': { maxRequests: 20, windowMs: 60 * 1000 },  // 20 per minute
};

export class RateLimitError extends Error {
  constructor(
    message: string,
    public retryAfter: number
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

/**
 * Check if a request should be rate-limited
 * @param identifier - User ID, IP address, or other unique identifier
 * @param action - Action type (e.g., 'create-student', 'delete-exam')
 * @throws RateLimitError if rate limit is exceeded
 */
export async function checkRateLimit(
  identifier: string,
  action: string
): Promise<void> {
  // Determine which rate limit config to use
  const actionType = action.split('-')[0]; // e.g., 'create-student' → 'create'
  const config = RATE_LIMITS[actionType] || RATE_LIMITS.default;

  const key = `${identifier}:${action}`;
  const now = Date.now();

  // Clean up expired entries (simple garbage collection)
  if (store.size > 10000) {
    for (const [k, v] of store.entries()) {
      if (v.resetTime < now) {
        store.delete(k);
      }
    }
  }

  const record = store.get(key);

  if (!record || record.resetTime < now) {
    // First request in this window or window expired
    store.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return;
  }

  if (record.count >= config.maxRequests) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    throw new RateLimitError(
      `Rate limit exceeded for ${action}. Try again in ${retryAfter} seconds.`,
      retryAfter
    );
  }

  // Increment counter
  record.count++;
  store.set(key, record);
}

/**
 * Get current rate limit status for an identifier
 * Useful for showing users how many requests they have left
 */
export async function getRateLimitStatus(
  identifier: string,
  action: string
): Promise<{
  remaining: number;
  resetTime: number;
  limit: number;
}> {
  const actionType = action.split('-')[0];
  const config = RATE_LIMITS[actionType] || RATE_LIMITS.default;
  const key = `${identifier}:${action}`;
  const now = Date.now();

  const record = store.get(key);

  if (!record || record.resetTime < now) {
    return {
      remaining: config.maxRequests,
      resetTime: now + config.windowMs,
      limit: config.maxRequests,
    };
  }

  return {
    remaining: Math.max(0, config.maxRequests - record.count),
    resetTime: record.resetTime,
    limit: config.maxRequests,
  };
}

/**
 * Reset rate limit for a specific identifier and action
 * Useful for testing or manual overrides
 */
export async function resetRateLimit(
  identifier: string,
  action: string
): Promise<void> {
  const key = `${identifier}:${action}`;
  store.delete(key);
}

// ============================================================================
// PRODUCTION UPGRADE PATH
// ============================================================================
//
// For production deployment with multiple server instances, replace the
// in-memory store with Redis/Upstash:
//
// 1. Install dependencies:
//    npm install @upstash/ratelimit @upstash/redis
//
// 2. Set up Upstash Redis:
//    - Sign up at https://upstash.com
//    - Create a Redis database
//    - Get UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
//
// 3. Add to .env:
//    UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
//    UPSTASH_REDIS_REST_TOKEN=xxx
//
// 4. Replace implementation:
//    import { Ratelimit } from "@upstash/ratelimit";
//    import { Redis } from "@upstash/redis";
//
//    const redis = Redis.fromEnv();
//
//    const limiters = {
//      mutation: new Ratelimit({
//        redis,
//        limiter: Ratelimit.slidingWindow(10, "1 m"),
//      }),
//      create: new Ratelimit({
//        redis,
//        limiter: Ratelimit.slidingWindow(5, "1 m"),
//      }),
//      // ... etc
//    };
//
//    export async function checkRateLimit(identifier: string, action: string) {
//      const actionType = action.split('-')[0];
//      const limiter = limiters[actionType] || limiters.default;
//      const { success } = await limiter.limit(identifier);
//      if (!success) {
//        throw new RateLimitError('Rate limit exceeded', 60);
//      }
//    }
//
// ============================================================================
