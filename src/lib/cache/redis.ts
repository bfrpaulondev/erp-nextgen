/**
 * Redis Client for Caching & Sessions
 * Used for: Session storage, cache, job queues
 * NOT for persistent data storage (use PostgreSQL)
 */

import Redis from 'ioredis'

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined
}

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    enableReadyCheck: true,
    lazyConnect: true,
  })

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis

// Cache utility functions
export const cache = {
  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    const value = await redis.get(key)
    if (!value) return null
    try {
      return JSON.parse(value) as T
    } catch {
      return value as unknown as T
    }
  },

  /**
   * Set cache value with optional TTL (in seconds)
   */
  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value)
    if (ttl) {
      await redis.setex(key, ttl, serialized)
    } else {
      await redis.set(key, serialized)
    }
  },

  /**
   * Delete cached value
   */
  async del(key: string): Promise<void> {
    await redis.del(key)
  },

  /**
   * Delete all keys matching pattern
   */
  async delPattern(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  },

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const result = await redis.exists(key)
    return result === 1
  },

  /**
   * Get TTL of a key
   */
  async ttl(key: string): Promise<number> {
    return redis.ttl(key)
  },
}

// Cache key generators
export const cacheKeys = {
  company: (companyId: string) => `company:${companyId}`,
  companySettings: (companyId: string) => `company:${companyId}:settings`,
  user: (userId: string) => `user:${userId}`,
  userCompanies: (userId: string) => `user:${userId}:companies`,
  invoice: (invoiceId: string) => `invoice:${invoiceId}`,
  dashboardStats: (companyId: string) => `dashboard:${companyId}:stats`,
  chartOfAccounts: (companyId: string) => `accounts:${companyId}`,
  taxRates: (companyId: string) => `taxRates:${companyId}`,
  stockAlerts: (companyId: string) => `stock:${companyId}:alerts`,
}

export default redis
